#!/usr/bin/env node
// publisher.js — Handles /SPAWN commands with Quality Gate
//
// Polls SPAWN_CHANNEL_ID for messages starting with /SPAWN.
// Format: /SPAWN [market] [content]
//   market: japan | thai | dubai | others
//
// Quality Gate:
//   1. Read intelligence files (POST-PERFORMANCE.md, COMPETITOR-INTEL.md)
//   2. Generate post via Gemini
//   3. Gemini self-scores 1-10
//   4. Score < 7: regenerate, max 2 retries
//   5. Still < 7 after retries: save to drafts/
//   6. Score >= 7: postWebhook() to matching market channel
//
// Run as persistent service: nohup node publisher.js &

const fs = require("fs");
const path = require("path");
const config = require("./lib/config");
const {
  log: _log, discordApi, geminiGenerate, postWebhook,
  loadJson, saveJson, sleep, sanitize,
} = require("./lib/utils");

const log = (msg) => _log("publisher", msg);
const STATE_FILE = path.join(config.DATA_DIR, "publisher-state.json");
const DRAFTS_DIR = path.join(__dirname, "drafts");
const INTELLIGENCE_DIR = path.join(process.env.HOME || "/root", ".openclaw/workspace/intelligence");

const MARKET_WEBHOOKS = {
  japan: config.JAPAN_WEBHOOK_URL,
  thai: config.THAI_WEBHOOK_URL,
  dubai: config.DUBAI_WEBHOOK_URL,
  others: config.OTHERS_WEBHOOK_URL,
};

const MARKET_LABELS = {
  japan: "🇯🇵 日本",
  thai: "🇹🇭 泰國",
  dubai: "🇦🇪 杜拜",
  others: "🌏 其他市場",
};

const POLL_INTERVAL_MS = 30_000; // 30 seconds

function readIntelligence(filename) {
  try {
    return fs.readFileSync(path.join(INTELLIGENCE_DIR, filename), "utf8").trim();
  } catch {
    return null;
  }
}

function parseSpawnCommand(content) {
  // /SPAWN [market] [content body...]
  const m = content.trim().match(/^\/SPAWN\s+(\S+)\s+([\s\S]+)$/i);
  if (!m) return null;
  const market = m[1].toLowerCase();
  if (!MARKET_WEBHOOKS[market]) return null;
  return { market, body: m[2].trim() };
}

async function generatePost(market, body, perfContext, competitorContext) {
  const intelligenceBlock = [
    perfContext ? `=== 貼文績效參考 ===\n${perfContext}` : null,
    competitorContext ? `=== 競品情報 ===\n${competitorContext}` : null,
  ].filter(Boolean).join("\n\n");

  const prompt = `你是 Arthur，專業海外置產顧問，負責在 Discord 社群發佈市場資訊。

目標市場：${MARKET_LABELS[market] || market}
原始內容：${body}
${intelligenceBlock ? `\n${intelligenceBlock}\n` : ""}
請將上方原始內容改寫為一篇適合 Discord 社群的置產資訊貼文。格式要求：
- 第一行：吸引人的標題（含相關 emoji）
- 接著：2-4 個重點條列（每條含 emoji）
- 最後：1 句行動呼籲
- 全文使用繁體中文
- 保持專業但平易近人的語氣
- 不超過 400 字

只輸出貼文本文，不要加任何說明。`;

  return geminiGenerate(prompt);
}

async function scorePost(post) {
  const prompt = `你是嚴格的內容品質審核員。請評分以下 Discord 置產社群貼文：

---
${post}
---

評分標準（總分 10 分）：
- 標題吸引力（2 分）
- 內容實用性（3 分）
- 結構清晰度（2 分）
- 行動呼籲效果（2 分）
- 整體語氣適切性（1 分）

只輸出一個 1-10 的整數分數，不要有任何其他文字。`;

  const result = await geminiGenerate(prompt);
  const score = parseInt(result.trim(), 10);
  return isNaN(score) ? 0 : Math.min(10, Math.max(1, score));
}

async function saveToDrafts(market, post, score, originalBody) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${timestamp}-${market}.md`;
  const filepath = path.join(DRAFTS_DIR, filename);
  const content = `# Draft: ${MARKET_LABELS[market] || market}\n\n` +
    `**Score:** ${score}/10 (below threshold)\n` +
    `**Original:** ${originalBody}\n\n` +
    `---\n\n${post}\n`;
  fs.writeFileSync(filepath, content, "utf8");
  log(`Saved draft: drafts/${filename} (score ${score})`);
  return filename;
}

async function processSpawnCommand(msg, state, perfContext, competitorContext) {
  const parsed = parseSpawnCommand(msg.content);
  if (!parsed) {
    log(`Skipping malformed /SPAWN: ${msg.id}`);
    state.processedMsgIds.push(msg.id);
    return;
  }

  const { market, body } = parsed;
  const webhookUrl = MARKET_WEBHOOKS[market];
  log(`Processing /SPAWN [${market}] from ${msg.author?.username || msg.author?.id}`);

  let post = null;
  let score = 0;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) log(`Retry ${attempt}/${MAX_RETRIES} (previous score: ${score})`);

    try {
      post = sanitize(await generatePost(market, body, perfContext, competitorContext));
      await sleep(1000);
      score = await scorePost(post);
      log(`Generated post score: ${score}/10`);
    } catch (e) {
      log(`ERROR generating post (attempt ${attempt + 1}): ${e.message}`);
      continue;
    }

    if (score >= 7) break;
    if (attempt < MAX_RETRIES) await sleep(2000);
  }

  if (score < 7) {
    await saveToDrafts(market, post || "(generation failed)", score, body);
  } else {
    try {
      const statusCode = await postWebhook(webhookUrl, post);
      log(`Posted to ${market} channel (HTTP ${statusCode}), score ${score}/10`);
    } catch (e) {
      log(`ERROR posting to webhook: ${e.message}`);
    }
  }

  state.processedMsgIds.push(msg.id);
}

async function poll() {
  const state = loadJson(STATE_FILE) || { processedMsgIds: [] };

  // Read intelligence files (skip if missing)
  const perfContext = readIntelligence("POST-PERFORMANCE.md");
  const competitorContext = readIntelligence("COMPETITOR-INTEL.md");
  if (perfContext) log("Loaded POST-PERFORMANCE.md");
  if (competitorContext) log("Loaded COMPETITOR-INTEL.md");

  let msgs;
  try {
    msgs = await discordApi("GET", `/channels/${config.SPAWN_CHANNEL_ID}/messages?limit=20`);
  } catch (e) {
    log(`ERROR fetching messages: ${e.message}`);
    return;
  }

  if (!Array.isArray(msgs)) {
    log("No messages or channel error");
    return;
  }

  const spawnMsgs = msgs.filter((m) => {
    if (m.author?.bot) return false;
    if (state.processedMsgIds.includes(m.id)) return false;
    return (m.content || "").trim().toUpperCase().startsWith("/SPAWN");
  });

  if (spawnMsgs.length === 0) {
    return;
  }

  log(`Found ${spawnMsgs.length} unprocessed /SPAWN command(s)`);

  // Process oldest first
  for (const msg of spawnMsgs.reverse()) {
    await processSpawnCommand(msg, state, perfContext, competitorContext);
    await sleep(3000);
  }

  // Trim state to prevent unbounded growth
  state.processedMsgIds = (state.processedMsgIds || []).slice(-300);
  saveJson(STATE_FILE, state);
}

async function run() {
  log("Publisher started — polling every 30s");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await poll();
    } catch (e) {
      log(`FATAL poll error: ${e.message}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

run().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1); });
