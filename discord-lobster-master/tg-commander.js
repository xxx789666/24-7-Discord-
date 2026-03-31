// tg-commander.js — Telegram remote control for Arthur bot
// Persistent long-polling service. Zero npm dependencies.
// Commands: /status /spawn /pause /resume /report /heal /stats /help

"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");
const config = require("./lib/config");
const { log: _log, loadJson, saveJson, sleep } = require("./lib/utils");

// ── Config ────────────────────────────────────────────────────────────────────

const ENV_FILE = path.join(__dirname, ".env");
try {
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

if (!TG_TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is required. Set it in .env.");
  process.exit(1);
}
if (!ADMIN_CHAT_ID) {
  console.error("ERROR: TELEGRAM_ADMIN_CHAT_ID is required. Set it in .env.");
  process.exit(1);
}

const ADMIN_ID = String(ADMIN_CHAT_ID).trim();
const DATA_DIR = config.DATA_DIR;
const SPAWN_QUEUE_FILE = path.join(DATA_DIR, "spawn-queue.json");
const PAUSE_LOCK_FILE = path.join(DATA_DIR, "pause.lock");

function log(msg) { _log("tg-commander", msg); }

// ── Telegram API ──────────────────────────────────────────────────────────────

function tgRequest(method, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "api.telegram.org",
      path: `/bot${TG_TOKEN}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error(`TG parse error on ${method}`)); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function tgGet(method, params) {
  return new Promise((resolve, reject) => {
    const qs = params
      ? "?" + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
      : "";
    const opts = {
      hostname: "api.telegram.org",
      path: `/bot${TG_TOKEN}/${method}${qs}`,
      method: "GET",
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error(`TG parse error on ${method}`)); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function sendMessage(chatId, text) {
  return tgRequest("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return "從未執行";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function readState(filename) {
  return loadJson(path.join(DATA_DIR, filename)) || {};
}

// ── Commands ──────────────────────────────────────────────────────────────────

function cmdStatus() {
  const scripts = [
    { name: "welcome.js",         file: "welcome-state.json" },
    { name: "vibes.js",           file: "vibes-state.json" },
    { name: "memory.js",          file: "memory-state.json" },
    { name: "news.js",            file: "news-state.json" },
    { name: "arthur-agent.js",    file: "arthur-agent-state.json" },
    { name: "research-chain.js",  file: "research-chain-state.json" },
    { name: "self-heal.js",       file: "self-heal-state.json" },
    { name: "weekly-strategy.js", file: "weekly-strategy-state.json" },
    { name: "publisher.js",       file: "publisher-state.json" },
  ];

  const paused = fs.existsSync(PAUSE_LOCK_FILE);
  let lines = [`*Arthur Bot 狀態報告* ${paused ? "⏸ 已暫停" : "▶️ 運行中"}\n`];

  for (const s of scripts) {
    const state = readState(s.file);
    const lastRun = state.lastRun || state.lastRunAt || null;
    lines.push(`• \`${s.name}\` — ${fmtTime(lastRun)}`);
  }

  return lines.join("\n");
}

function cmdSpawn(args) {
  // /spawn <market> <content...>
  // market: japan | thai | dubai | others
  const [market, ...rest] = args;
  const content = rest.join(" ").trim();

  const validMarkets = ["japan", "thai", "dubai", "others"];
  if (!market || !validMarkets.includes(market.toLowerCase())) {
    return `❌ 用法：/spawn <市場> <內容>\n市場選項：${validMarkets.join(" | ")}`;
  }
  if (!content) {
    return "❌ 請提供貼文內容。用法：/spawn <市場> <內容>";
  }

  const queue = loadJson(SPAWN_QUEUE_FILE) || [];
  queue.push({
    market: market.toLowerCase(),
    content,
    requestedAt: new Date().toISOString(),
    status: "pending",
  });
  saveJson(SPAWN_QUEUE_FILE, queue);

  log(`SPAWN queued: market=${market} content="${content.slice(0, 50)}..."`);
  return `✅ 已將 \`${market}\` 市場的貼文加入發布佇列。\n內容預覽：${content.slice(0, 100)}${content.length > 100 ? "…" : ""}`;
}

function cmdPause() {
  if (fs.existsSync(PAUSE_LOCK_FILE)) {
    return "⚠️ 系統已處於暫停狀態。";
  }
  try {
    fs.writeFileSync(PAUSE_LOCK_FILE, new Date().toISOString());
    log("Pause lock created.");
    return "⏸ 系統已暫停。所有腳本將跳過執行直到 /resume。";
  } catch (e) {
    return `❌ 建立暫停鎖定失敗：${e.message}`;
  }
}

function cmdResume() {
  if (!fs.existsSync(PAUSE_LOCK_FILE)) {
    return "⚠️ 系統並未暫停。";
  }
  try {
    fs.unlinkSync(PAUSE_LOCK_FILE);
    log("Pause lock removed.");
    return "▶️ 系統已恢復執行。";
  } catch (e) {
    return `❌ 移除暫停鎖定失敗：${e.message}`;
  }
}

function cmdReport() {
  const healState = readState("self-heal-state.json");

  // Estimate RPD: count state file writes today
  const stateFiles = [
    "welcome-state.json", "vibes-state.json", "memory-state.json",
    "news-state.json", "arthur-agent-state.json", "research-chain-state.json",
    "self-heal-state.json", "weekly-strategy-state.json", "publisher-state.json",
  ];

  let totalRpd = 0;
  const today = new Date().toISOString().slice(0, 10);
  const lines = ["*今日 RPD 估算報告*\n"];

  for (const f of stateFiles) {
    const fp = path.join(DATA_DIR, f);
    try {
      const stat = fs.statSync(fp);
      const modified = stat.mtime.toISOString().slice(0, 10);
      if (modified === today) {
        // Each state file write ~= 1 Gemini call; scripts run on fixed schedule
        const scriptRpd = {
          "welcome-state.json":        20,  // every 3 min × ~6.7/hr = ~160 checks but few calls
          "vibes-state.json":          3,   // every 20 min = 3/hr
          "memory-state.json":         6,   // every 10 min = 6/hr
          "news-state.json":           1,
          "arthur-agent-state.json":  10,
          "research-chain-state.json": 2,   // 2×/day, 5 URLs each
          "self-heal-state.json":      6,
          "weekly-strategy-state.json":1,
          "publisher-state.json":      5,
        }[f] || 0;
        totalRpd += scriptRpd;
        lines.push(`• \`${f.replace("-state.json", "")}\` — 今日已執行，估算 ${scriptRpd} RPD`);
      } else {
        lines.push(`• \`${f.replace("-state.json", "")}\` — 今日未執行`);
      }
    } catch {
      lines.push(`• \`${f.replace("-state.json", "")}\` — 狀態檔不存在`);
    }
  }

  lines.push(`\n*估算總計：${totalRpd} RPD / 1500 (${((totalRpd / 1500) * 100).toFixed(1)}%)*`);
  lines.push(`目標上限：125 RPD/天`);

  if (healState.errors) {
    lines.push(`\n⚠️ self-heal 已記錄 ${healState.errors.length} 個錯誤`);
  }

  return lines.join("\n");
}

function cmdHeal() {
  const healState = readState("self-heal-state.json");

  if (!healState || Object.keys(healState).length === 0) {
    return "⚠️ self-heal-state.json 不存在或為空。self-heal.js 可能尚未執行過。";
  }

  const lines = ["*Self-Heal 最後健康檢查報告*\n"];
  const lastRun = healState.lastRun || healState.lastRunAt;
  lines.push(`最後執行：${fmtTime(lastRun)}`);

  if (healState.checks) {
    lines.push("\n*各項檢查：*");
    for (const [k, v] of Object.entries(healState.checks)) {
      const status = v === "ok" || v === true ? "✅" : "❌";
      lines.push(`${status} ${k}：${v}`);
    }
  }

  if (healState.errors && healState.errors.length > 0) {
    lines.push("\n*最近錯誤（最新 5 筆）：*");
    const recent = healState.errors.slice(-5);
    for (const e of recent) {
      lines.push(`• ${fmtTime(e.time)} — ${e.script}：${e.message}`);
    }
  } else {
    lines.push("\n✅ 無記錄錯誤");
  }

  if (healState.healed) {
    lines.push(`\n自動修復次數：${healState.healed}`);
  }

  return lines.join("\n");
}

function cmdStats() {
  const memoryData = loadJson(config.MEMORY_FILE) || {};
  const agentState = readState("arthur-agent-state.json");

  const memberCount = Object.keys(memoryData).length;
  const interactions = agentState.totalInteractions || agentState.interactions?.length || 0;
  const threadsHandled = agentState.threadsHandled || 0;

  const spawnQueue = loadJson(SPAWN_QUEUE_FILE) || [];
  const pendingSpawns = spawnQueue.filter((q) => q.status === "pending").length;

  return [
    "*Arthur Bot 統計數據*\n",
    `👥 已建檔成員數：${memberCount}`,
    `💬 Arthur Agent 互動次數：${interactions}`,
    `🧵 處理過的討論串：${threadsHandled}`,
    `📝 待發布佇列：${pendingSpawns} 篇`,
    `⏸ 暫停狀態：${fs.existsSync(PAUSE_LOCK_FILE) ? "是" : "否"}`,
  ].join("\n");
}

function cmdHelp() {
  return [
    "*Arthur Bot 指令說明*\n",
    "📊 `/status` — 回報各腳本最後執行時間與系統狀態",
    "📝 `/spawn <市場> <內容>` — 觸發發布任務（市場：japan / thai / dubai / others）",
    "⏸ `/pause` — 暫停所有腳本執行",
    "▶️ `/resume` — 恢復腳本執行",
    "📈 `/report` — 回報今日 RPD 使用量估算",
    "🔧 `/heal` — 查看 self-heal 最後一次健康檢查結果",
    "📉 `/stats` — 回報成員數與互動統計",
    "❓ `/help` — 顯示此說明",
    "\n⚠️ 僅限管理員使用",
  ].join("\n");
}

// ── Message handler ───────────────────────────────────────────────────────────

async function handleMessage(msg) {
  const chatId = String(msg.chat?.id);
  const text = (msg.text || "").trim();

  if (chatId !== ADMIN_ID) {
    log(`Ignored message from unauthorized chat_id=${chatId}`);
    return;
  }

  if (!text.startsWith("/")) return;

  const [rawCmd, ...args] = text.split(/\s+/);
  // Strip bot username suffix (e.g. /help@MyBot)
  const cmd = rawCmd.split("@")[0].toLowerCase();

  log(`Command received: ${cmd} args=${JSON.stringify(args)}`);

  let reply;
  try {
    switch (cmd) {
      case "/status":  reply = cmdStatus();       break;
      case "/spawn":   reply = cmdSpawn(args);    break;
      case "/pause":   reply = cmdPause();        break;
      case "/resume":  reply = cmdResume();       break;
      case "/report":  reply = cmdReport();       break;
      case "/heal":    reply = cmdHeal();         break;
      case "/stats":   reply = cmdStats();        break;
      case "/help":    reply = cmdHelp();         break;
      default:
        reply = `❓ 未知指令：\`${cmd}\`\n輸入 /help 查看所有指令。`;
    }
  } catch (e) {
    log(`Error handling ${cmd}: ${e.message}`);
    reply = `❌ 執行指令時發生錯誤：${e.message}`;
  }

  try {
    await sendMessage(chatId, reply);
  } catch (e) {
    log(`Failed to send reply: ${e.message}`);
  }
}

// ── Long-polling loop ─────────────────────────────────────────────────────────

let offset = 0;
let backoff = 1000; // ms
let running = true;

async function poll() {
  try {
    const res = await tgGet("getUpdates", { offset, timeout: 30 });

    if (!res.ok) {
      log(`getUpdates not ok: ${JSON.stringify(res)}`);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60000);
      return;
    }

    backoff = 1000; // reset on success

    for (const update of res.result || []) {
      offset = update.update_id + 1;
      if (update.message) {
        await handleMessage(update.message);
      }
    }
  } catch (e) {
    log(`Poll error: ${e.message} — retrying in ${backoff}ms`);
    await sleep(backoff);
    backoff = Math.min(backoff * 2, 60000);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal) {
  log(`Received ${signal}, shutting down gracefully…`);
  running = false;
  // Give in-flight poll a moment to finish
  await sleep(500);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("tg-commander starting up…");
  log(`Admin chat ID: ${ADMIN_ID}`);

  // Send startup notification
  try {
    await sendMessage(ADMIN_ID, "🚀 *Arthur tg-commander 已啟動*\n輸入 /help 查看可用指令。");
  } catch (e) {
    log(`Startup notification failed: ${e.message}`);
  }

  while (running) {
    await poll();
  }
}

main().catch((e) => {
  log(`Fatal: ${e.message}`);
  process.exit(1);
});
