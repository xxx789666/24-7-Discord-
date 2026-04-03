#!/usr/bin/env node
// self-heal.js — 三層自癒哨兵
//
// Layer 1: 偵測 7 種問題並嘗試自動修復
// Layer 2: 修復失敗 → Gemini 診斷
// Layer 3: Telegram Bot API 推播告警給 TELEGRAM_ADMIN_CHAT_ID
//
// 每 10 分鐘由 cron 執行。零 npm 依賴。

const fs = require("fs");
const path = require("path");
const https = require("https");
const config = require("./lib/config");
const {
  log: _log, geminiGenerate,
  loadJson, saveJson,
} = require("./lib/utils");

const log = (msg) => _log("self-heal", msg);
const STATE_FILE = path.join(config.DATA_DIR, "self-heal-state.json");

const HEAP_LIMIT_MB = 500;
const DISK_LIMIT_KB = 102400; // 100 MB
const STALE_MULTIPLIER = 2;

// Expected cron intervals in minutes for each script's state file
const SCRIPT_INTERVALS = {
  "welcome-state.json": 3,
  "vibes-state.json": 20,
  "memory-state.json": 10,
  "news-state.json": 1440,        // daily 09:00
  "research-chain-state.json": 720, // twice daily
};

// ── Telegram helper ──────────────────────────────────────────────────────────
function sendTelegram(token, chatId, text) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" });
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${token}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => { res.resume(); resolve(res.statusCode); }
    );
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
    req.write(payload);
    req.end();
  });
}

// ── Webhook HEAD check ───────────────────────────────────────────────────────
function checkWebhook(webhookUrl) {
  return new Promise((resolve) => {
    try {
      const url = new URL(webhookUrl);
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: "HEAD",
        },
        (res) => { res.resume(); resolve(res.statusCode < 500); }
      );
      req.setTimeout(6000, () => { req.destroy(); resolve(false); });
      req.on("error", () => resolve(false));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

// ── Data dir total size (KB) — flat scan, no recursion needed ───────────────
function getDirSizeKb(dir) {
  let total = 0;
  try {
    for (const f of fs.readdirSync(dir)) {
      try { total += fs.statSync(path.join(dir, f)).size; } catch {}
    }
  } catch {}
  return Math.round(total / 1024);
}

// ── Stale script detection via state file mtime ──────────────────────────────
function getStaleScripts() {
  const stale = [];
  const now = Date.now();
  for (const [file, intervalMin] of Object.entries(SCRIPT_INTERVALS)) {
    const fp = path.join(config.DATA_DIR, file);
    try {
      const { mtimeMs } = fs.statSync(fp);
      const ageMins = (now - mtimeMs) / 60000;
      if (ageMins > intervalMin * STALE_MULTIPLIER) {
        stale.push({
          script: file.replace("-state.json", ""),
          ageMins: Math.round(ageMins),
          limitMins: intervalMin * STALE_MULTIPLIER,
        });
      }
    } catch {
      // File doesn't exist yet — script never ran, skip
    }
  }
  return stale;
}

// ── Duplicate process detection & auto-kill ──────────────────────────────────
const { execSync } = require("child_process");

const PERSISTENT_SCRIPTS = ["publisher.js", "arthur-agent.js", "tg-commander.js"];

const PID_DIR = path.join(__dirname, "..", "pids");

function getDuplicateProcesses() {
  const duplicates = [];
  for (const script of PERSISTENT_SCRIPTS) {
    try {
      const out = execSync(
        `ps -eo pid,args --no-headers | grep "${script}" | grep -v grep | grep -v self-heal`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      if (!out) continue;
      const procs = out.split("\n").filter(Boolean);
      if (procs.length <= 1) continue;

      const parsed = procs.map((line) => {
        return parseInt(line.trim().split(/\s+/)[0], 10);
      }).filter((p) => !isNaN(p));

      // Prefer to keep the PID tracked by start-persistent.sh (PID file)
      const pidFile = path.join(PID_DIR, script.replace(".js", ".pid"));
      let keepPid = null;
      try {
        const tracked = parseInt(fs.readFileSync(pidFile, "utf8").trim(), 10);
        if (parsed.includes(tracked)) keepPid = tracked;
      } catch {}
      // Fall back: keep the newest (highest) PID
      if (!keepPid) keepPid = Math.max(...parsed);

      const toKill = parsed.filter((p) => p !== keepPid);
      duplicates.push({ script, pids: parsed, toKill, keepPid });
    } catch { /* ps/grep returned nothing — no duplicates */ }
  }
  return duplicates;
}

// ── State JSON corruption check ──────────────────────────────────────────────
function getCorruptedStateFiles() {
  const corrupted = [];
  try {
    for (const f of fs.readdirSync(config.DATA_DIR)) {
      if (!f.endsWith(".json")) continue;
      const fp = path.join(config.DATA_DIR, f);
      try {
        JSON.parse(fs.readFileSync(fp, "utf8"));
      } catch {
        corrupted.push(f);
      }
    }
  } catch {}
  return corrupted;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const state = loadJson(STATE_FILE) || { metrics: [] };
  if (!Array.isArray(state.metrics)) state.metrics = [];

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
  const TG_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
  const cooldownLock = path.join(config.DATA_DIR, "gemini-cooldown.lock");

  // ── Collect raw metrics ──────────────────────────────────────────────────
  const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const dataDirKb = getDirSizeKb(config.DATA_DIR);
  const [webhookOk, botlogsOk] = await Promise.all([
    checkWebhook(config.GENERAL_WEBHOOK_URL),
    config.BOTLOGS_WEBHOOK_URL ? checkWebhook(config.BOTLOGS_WEBHOOK_URL) : Promise.resolve(true),
  ]);
  const staleScripts = getStaleScripts();

  const errors = [];

  // ── Layer 1: Detect & attempt auto-fix ──────────────────────────────────
  log("Layer 1: 偵測問題...");

  // 1. Gemini RPD cooldown lock
  if (fs.existsSync(cooldownLock)) {
    const lockAgeHours = (Date.now() - fs.statSync(cooldownLock).mtimeMs) / 3600000;
    if (lockAgeHours > 24) {
      log(`Auto-fix: 移除過期 gemini-cooldown.lock（${lockAgeHours.toFixed(1)}h 前）`);
      try {
        fs.unlinkSync(cooldownLock);
      } catch (e) {
        errors.push(`gemini-lock-remove 失敗: ${e.message}`);
      }
    } else {
      errors.push(`gemini-cooldown.lock 存在（${lockAgeHours.toFixed(1)}h 前）— RPD 超限`);
    }
  }

  // 2. Webhook failure
  if (!webhookOk) {
    errors.push("GENERAL_WEBHOOK_URL 無回應 (HEAD 請求失敗)");
  }
  if (!botlogsOk) {
    errors.push("BOTLOGS_WEBHOOK_URL (#bot-logs) 無回應 (HEAD 請求失敗)");
  }

  // 3. Memory (heap) over threshold
  if (heapMB > HEAP_LIMIT_MB) {
    errors.push(`heap 使用量 ${heapMB} MB 超過上限 ${HEAP_LIMIT_MB} MB`);
  }

  // 4. Disk (data dir) over threshold
  if (dataDirKb > DISK_LIMIT_KB) {
    errors.push(`data/ 目錄 ${dataDirKb} KB 超過上限 ${DISK_LIMIT_KB} KB（100 MB）`);
  }

  // 5. State JSON corruption — auto-fix: rename to .corrupt
  const corrupted = getCorruptedStateFiles();
  for (const f of corrupted) {
    const src = path.join(config.DATA_DIR, f);
    const dst = src + ".corrupt";
    try {
      fs.renameSync(src, dst);
      log(`Auto-fix: 重命名損毀 state 檔案 ${f} → ${f}.corrupt`);
      errors.push(`state 檔案損毀（已備份）: ${f}`);
    } catch (e) {
      errors.push(`state 檔案損毀且無法備份: ${f} — ${e.message}`);
    }
  }

  // 6. Stale scripts (last run > 2× expected interval)
  for (const s of staleScripts) {
    errors.push(
      `腳本 ${s.script} 已 ${s.ageMins} 分鐘未執行（上限 ${s.limitMins} 分鐘）`
    );
  }

  // 7. Duplicate persistent processes — auto-kill older instances
  const duplicates = getDuplicateProcesses();
  for (const { script, pids, toKill, keepPid } of duplicates) {
    for (const pid of toKill) {
      try {
        process.kill(pid, "SIGTERM");
        log(`Auto-fix: 終止重複進程 ${script} PID ${pid}（保留 PID ${keepPid}）`);
      } catch (e) {
        errors.push(`${script} 重複進程 PID ${pid} 無法終止: ${e.message}`);
      }
    }
    errors.push(`偵測到 ${script} 重複執行（${pids.length} 個進程），已自動清除`);
  }

  // ── Save metrics (rolling 144 samples = 24h at 10-min interval) ─────────
  state.metrics.push({
    timestamp: new Date().toISOString(),
    heapMB,
    dataDirKb,
    webhookOk,
    staleScripts: staleScripts.map((s) => s.script),
    errors,
  });
  state.metrics = state.metrics.slice(-144);
  saveJson(STATE_FILE, state);

  if (errors.length === 0) {
    log("所有檢查通過，系統健康");
    process.exit(0);
  }

  log(`發現 ${errors.length} 個問題: ${errors.join(" | ")}`);

  // ── Layer 2: Gemini 診斷 ─────────────────────────────────────────────────
  log("Layer 2: Gemini 診斷...");
  let diagnosis = "（Gemini 診斷不可用）";

  // Only call Gemini if the cooldown lock is not blocking
  if (!fs.existsSync(cooldownLock)) {
    try {
      const prompt = `你是 Arthur Discord Bot 的系統管理 AI。以下是自癒哨兵的診斷報告，請用繁體中文提供簡短的修復建議（100 字以內）：

系統指標：
- Heap: ${heapMB} MB（上限 ${HEAP_LIMIT_MB} MB）
- Data 目錄: ${dataDirKb} KB
- Webhook 狀態: ${webhookOk ? "正常" : "失敗"}
- 停滯腳本: ${staleScripts.length > 0 ? staleScripts.map((s) => s.script).join(", ") : "無"}

發現問題：
${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

請提供最優先的修復步驟。`;

      diagnosis = await geminiGenerate(prompt, "self-heal");
      log(`Gemini 診斷完成（${diagnosis.length} 字）`);
    } catch (e) {
      log(`Gemini 診斷失敗: ${e.message}`);
      diagnosis = `Gemini 診斷失敗: ${e.message}`;
    }
  } else {
    log("Gemini cooldown lock 存在，跳過 Layer 2 診斷");
  }

  // ── Layer 3: Telegram 告警 ───────────────────────────────────────────────
  if (!TG_TOKEN || !TG_CHAT) {
    log("TELEGRAM_BOT_TOKEN 或 TELEGRAM_ADMIN_CHAT_ID 未設定，跳過 Telegram 告警");
    process.exit(1);
  }

  log("Layer 3: 發送 Telegram 告警...");
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  const alertText =
    `🚨 <b>Arthur Bot 自癒哨兵告警</b>\n` +
    `⏰ ${ts} UTC\n\n` +
    `<b>指標快照</b>\n` +
    `• Heap: ${heapMB} MB\n` +
    `• Data 目錄: ${dataDirKb} KB\n` +
    `• Webhook: ${webhookOk ? "✅ 正常" : "❌ 失敗"}\n\n` +
    `<b>發現問題（${errors.length} 項）</b>\n` +
    errors.map((e, i) => `${i + 1}. ${e}`).join("\n") +
    `\n\n<b>AI 診斷建議</b>\n${diagnosis}`;

  const tgStatus = await sendTelegram(TG_TOKEN, TG_CHAT, alertText);
  if (tgStatus === 200 || tgStatus === 204) {
    log("Telegram 告警已發送");
  } else {
    log(`Telegram 告警發送失敗，HTTP ${tgStatus}`);
  }

  process.exit(1);
}

main().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1); });
