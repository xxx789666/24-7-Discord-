// utils.js — Shared utilities for all lobster scripts
// Zero npm dependencies: pure Node.js https module

const fs = require("fs");
const https = require("https");
const path = require("path");
const config = require("./config");

// Ensure data and log directories exist
fs.mkdirSync(config.DATA_DIR, { recursive: true });
fs.mkdirSync(config.LOG_DIR, { recursive: true });

// ── #bot-logs Discord 同步 ────────────────────────────────────────────────────
const _botlogQueue = [];
let _botlogTimer = null;

function _flushBotlogs() {
  _botlogTimer = null;
  if (_botlogQueue.length === 0) return;
  const webhookUrl = config.BOTLOGS_WEBHOOK_URL;
  if (!webhookUrl) return;
  const lines = _botlogQueue.splice(0, _botlogQueue.length);
  const content = lines.join("\n").slice(0, 1900); // Discord 2000 char limit
  try {
    const url = new URL(webhookUrl);
    const body = JSON.stringify({ content, username: "Arthur Logs 📋" });
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => { res.resume(); });
    req.on("error", () => {});
    req.write(body);
    req.end();
  } catch {}
}

function _maybeForwardToDiscord(prefix, msg) {
  const webhookUrl = config.BOTLOGS_WEBHOOK_URL;
  if (!webhookUrl) return;

  // Emoji prefix by severity/type
  let emoji = null;
  if (/FATAL|UNHANDLED|UNCAUGHT/i.test(msg))      emoji = "🔴";
  else if (/ERROR/i.test(msg))                     emoji = "🟠";
  else if (/WARN/i.test(msg))                      emoji = "🟡";
  else if (/Daemon started|started —/i.test(msg))  emoji = "🟢";
  else if (/Replied to|Welcomed|Batch welcomed/i.test(msg)) emoji = "💬";
  else if (/posted to|Slash \/spawn posted/i.test(msg))     emoji = "📢";
  else if (/Done — [1-9]/i.test(msg))              emoji = "✅";
  else if (/PDF|upload/i.test(msg))                emoji = "📄";

  if (!emoji) return; // skip routine polling noise

  const ts = new Date().toISOString().slice(11, 19);
  _botlogQueue.push(`${emoji} \`[${ts}]\` **${prefix}** ${msg}`);

  // Batch: flush after 2s of inactivity to avoid rate limits
  clearTimeout(_botlogTimer);
  _botlogTimer = setTimeout(_flushBotlogs, 2000);
}

function log(prefix, msg) {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  const line = `[${ts}] ${msg}\n`;
  const logFile = path.join(config.LOG_DIR, `${prefix}.log`);
  try { fs.appendFileSync(logFile, line); } catch {}
  console.log(line.trim());
  _maybeForwardToDiscord(prefix, msg);
}

function discordApi(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "discord.com",
      path: `/api/v10${apiPath}`,
      method,
      headers: {
        Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve(null); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── RPD counter (actual call tracking) ───────────────────────────────────────
const RPD_FILE = path.join(config.DATA_DIR, "rpd-counter.json");

function incrementRpd(caller, isGcp) {
  const today = new Date().toISOString().slice(0, 10);
  let data;
  try { data = JSON.parse(fs.readFileSync(RPD_FILE, "utf8")); } catch { data = {}; }
  if (data.date !== today) data = { date: today, total: 0, by_script: {}, gcp_total: 0, gcp_by_script: {} };
  data.total = (data.total || 0) + 1;
  data.by_script[caller] = (data.by_script[caller] || 0) + 1;
  if (isGcp) {
    data.gcp_total = (data.gcp_total || 0) + 1;
    data.gcp_by_script = data.gcp_by_script || {};
    data.gcp_by_script[caller] = (data.gcp_by_script[caller] || 0) + 1;
  }
  try { fs.writeFileSync(RPD_FILE, JSON.stringify(data)); } catch {}
}

function readRpd() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const data = JSON.parse(fs.readFileSync(RPD_FILE, "utf8"));
    if (data.date === today) return data;
  } catch {}
  return { date: today, total: 0, by_script: {}, gcp_total: 0, gcp_by_script: {} };
}

// ── Gemini API key rotation ───────────────────────────────────────────────────
let _activeKeyIndex = 0;
function _getApiKey() {
  const keys = [config.GEMINI_API_KEY, config.GEMINI_API_KEY_2].filter(Boolean);
  return keys[_activeKeyIndex % keys.length];
}
function _rotateApiKey() {
  const keys = [config.GEMINI_API_KEY, config.GEMINI_API_KEY_2].filter(Boolean);
  if (keys.length > 1) {
    _activeKeyIndex = (_activeKeyIndex + 1) % keys.length;
    console.log(`[utils] Gemini key rotated to key #${_activeKeyIndex + 1}`);
  }
}

function _callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.error) { reject(Object.assign(new Error(parsed.error.message), { code: parsed.error.code })); return; }
          const text = parsed.candidates?.[0]?.content?.parts
            ?.filter((p) => !p.thought).map((p) => p.text).join("") || "";
          if (!text) { reject(new Error("Gemini returned empty response")); return; }
          resolve(text.trim());
        } catch { reject(new Error("Gemini parse error")); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function geminiGenerate(prompt, caller, keyOverride) {
  // Detect caller from stack if not provided
  if (!caller) {
    try {
      const stack = new Error().stack.split("\n")[2] || "";
      const m = stack.match(/[/\\]([^/\\]+)\.js/);
      caller = m ? m[1] : "unknown";
    } catch { caller = "unknown"; }
  }

  // If a specific key is forced, use it directly (retry once on 503)
  if (keyOverride) {
    try {
      const text = await _callGemini(prompt, keyOverride);
      incrementRpd(caller, true);
      return text;
    } catch (e) {
      if (e.code === 503) {
        console.log(`[utils] Gemini 503 (server overload) — waiting 10s then retrying (caller: ${caller})`);
        await new Promise((r) => setTimeout(r, 10000));
        const text = await _callGemini(prompt, keyOverride);
        incrementRpd(caller, true);
        return text;
      }
      throw new Error(`Gemini API error ${e.code || ""}: ${e.message}`);
    }
  }

  // Strategy: try free key first → rotate free key on 429 → fallback to GCP paid key
  // 503 (server overload) → sleep 10s and retry once with same or GCP key
  const freeKey = _getApiKey();
  try {
    const text = await _callGemini(prompt, freeKey);
    incrementRpd(caller, false);
    return text;
  } catch (e) {
    if (e.code === 429) {
      _rotateApiKey();
      const gcpKey = config.GEMINI_API_KEY_GCP;
      if (gcpKey) {
        console.log(`[utils] Free key 429 — falling back to GCP paid key (caller: ${caller})`);
        const text = await _callGemini(prompt, gcpKey);
        incrementRpd(caller, true);
        return text;
      }
    }
    if (e.code === 503) {
      console.log(`[utils] Gemini 503 (server overload) — waiting 10s then retrying (caller: ${caller})`);
      await new Promise((r) => setTimeout(r, 10000));
      const gcpKey = config.GEMINI_API_KEY_GCP;
      const retryKey = gcpKey || freeKey;
      const isPaid = Boolean(gcpKey);
      const text = await _callGemini(prompt, retryKey);
      incrementRpd(caller, isPaid);
      return text;
    }
    throw new Error(`Gemini API error ${e.code || ""}: ${e.message}`);
  }
}

function postWebhook(webhookUrl, content, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const body = { content, username: config.BOT_NAME, avatar_url: config.BOT_AVATAR_URL };
    if (opts.suppressEmbeds) body.flags = 4;
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function loadJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return null; }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Strip @everyone and @here for safety
function sanitize(text) {
  return text.replace(/@everyone/g, "").replace(/@here/g, "");
}

module.exports = {
  log, discordApi, geminiGenerate, postWebhook,
  loadJson, saveJson, sleep, sanitize, readRpd,
};
