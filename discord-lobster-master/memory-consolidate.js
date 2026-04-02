#!/usr/bin/env node
// memory-consolidate.js — Weekly WISDOM.md synthesis
//
// Reads member-memory.json and recent activity from state files,
// calls Gemini once to extract weekly insights, then appends a
// dated section to ~/.openclaw/workspace/intelligence/WISDOM.md.
//
// Run every Sunday at 23:00 via cron.
// RPD cost: ~5/run.

const fs = require("fs");
const os = require("os");
const path = require("path");
const config = require("./lib/config");
const {
  log: _log, geminiGenerate,
  loadJson, saveJson,
} = require("./lib/utils");

const log = (msg) => _log("memory-consolidate", msg);
const STATE_FILE = path.join(config.DATA_DIR, "memory-consolidate-state.json");
const WISDOM_FILE = path.join(os.homedir(), ".openclaw", "workspace", "intelligence", "WISDOM.md");

// Load recent entries from a state file (last 7 days)
function loadRecentActivity(stateFileName) {
  const filePath = path.join(config.DATA_DIR, stateFileName);
  const data = loadJson(filePath);
  if (!data) return [];

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const entries = [];

  // arthur-agent-state: answered threads
  if (data.answered && Array.isArray(data.answered)) {
    for (const item of data.answered) {
      const ts = item.answeredAt || item.createdAt || null;
      if (!ts || new Date(ts).getTime() < cutoff) continue;
      if (item.question) entries.push({ type: "question", text: item.question.slice(0, 300) });
    }
  }

  // publisher-state: posted drafts
  if (data.posted && Array.isArray(data.posted)) {
    for (const item of data.posted) {
      const ts = item.postedAt || null;
      if (!ts || new Date(ts).getTime() < cutoff) continue;
      if (item.topic) entries.push({ type: "post", text: item.topic.slice(0, 200) });
    }
  }

  // news-state: published news items
  if (data.publishedItems && Array.isArray(data.publishedItems)) {
    for (const item of data.publishedItems) {
      const ts = item.publishedAt || null;
      if (!ts || new Date(ts).getTime() < cutoff) continue;
      if (item.title) entries.push({ type: "news", text: item.title.slice(0, 200) });
    }
  }

  return entries;
}

function summarizeMemory(memory) {
  const profiles = Object.values(memory);
  if (profiles.length === 0) return "（無成員資料）";

  // Collect markets and budget ranges
  const marketCounts = {};
  const budgetRanges = [];
  const purposes = [];

  for (const p of profiles) {
    for (const m of (p.targetMarket || [])) {
      marketCounts[m] = (marketCounts[m] || 0) + 1;
    }
    if (p.budget) budgetRanges.push(p.budget);
    if (p.purpose) purposes.push(p.purpose);
  }

  const topMarkets = Object.entries(marketCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([m, c]) => `${m}(${c}人)`)
    .join("、");

  const lines = [
    `總成員數：${profiles.length}`,
    topMarkets ? `熱門目標市場：${topMarkets}` : null,
    budgetRanges.length ? `預算範圍樣本：${budgetRanges.slice(0, 5).join("、")}` : null,
    purposes.length ? `購買目的樣本：${purposes.slice(0, 5).join("、")}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

async function main() {
  const state = loadJson(STATE_FILE) || { lastRunAt: null };

  // Idempotency guard: skip if already ran this week (within 6 days)
  if (state.lastRunAt) {
    const elapsed = Date.now() - new Date(state.lastRunAt).getTime();
    if (elapsed < 6 * 24 * 60 * 60 * 1000) {
      log(`Already ran ${state.lastRunAt}, skipping`);
      process.exit(0);
    }
  }

  log("Starting weekly WISDOM.md consolidation");

  // 1. Load member memory
  const memory = loadJson(config.MEMORY_FILE) || {};
  const memberCount = Object.keys(memory).length;
  log(`Loaded ${memberCount} member profiles`);

  // 2. Load recent activity from state files
  const activity = [
    ...loadRecentActivity("arthur-agent-state.json"),
    ...loadRecentActivity("publisher-state.json"),
    ...loadRecentActivity("news-state.json"),
  ];
  log(`Loaded ${activity.length} recent activity entries`);

  // 3. Build prompt
  const memorySummary = summarizeMemory(memory);
  const recentQuestions = activity
    .filter((a) => a.type === "question")
    .map((a) => `- ${a.text}`)
    .join("\n") || "（本週無提問紀錄）";
  const recentPosts = activity
    .filter((a) => a.type === "post" || a.type === "news")
    .map((a) => `- ${a.text}`)
    .join("\n") || "（本週無發文紀錄）";

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `你是一位房地產社群分析師。以下是本週的社群數據。請用繁體中文撰寫一份簡潔的週度洞察報告。

## 成員輪廓摘要
${memorySummary}

## 本週提問（Arthur Agent）
${recentQuestions}

## 本週發文主題
${recentPosts}

請輸出以下四個小節，每節 2-3 句：
1. **常見問題與關切** — 本週成員最常問的問題類型
2. **熱門目標市場** — 本週最受關注的海外房市
3. **成員輪廓趨勢** — 預算、購買目的、背景的明顯趨勢
4. **下週建議焦點** — 建議優先製作哪類內容或主動觸及哪類成員

格式要求：純文字，不超過 400 字，不加額外標題或分隔線。`;

  let insights;
  try {
    log("Calling Gemini for weekly synthesis (RPD +1)");
    insights = await geminiGenerate(prompt, "memory-consolidate", config.GEMINI_API_KEY_GCP || undefined);
    if (!insights || insights.length < 20) throw new Error("Empty response from Gemini");
    log(`Received ${insights.length} chars of insights`);
  } catch (e) {
    log(`ERROR generating insights: ${e.message}`);
    process.exit(1);
  }

  // 4. Append to WISDOM.md (never overwrite)
  const wisdomDir = path.dirname(WISDOM_FILE);
  try {
    fs.mkdirSync(wisdomDir, { recursive: true });
  } catch {}

  const section = `\n## ${today} Weekly Consolidation\n\n${insights}\n`;

  try {
    fs.appendFileSync(WISDOM_FILE, section, "utf8");
    log(`Appended weekly consolidation to ${WISDOM_FILE}`);
  } catch (e) {
    log(`ERROR writing WISDOM.md: ${e.message}`);
    process.exit(1);
  }

  // 5. Save state
  state.lastRunAt = new Date().toISOString();
  state.history = (state.history || []);
  state.history.push({ runAt: state.lastRunAt, memberCount, activityCount: activity.length });
  state.history = state.history.slice(-12); // keep last 12 weeks
  saveJson(STATE_FILE, state);

  log("Done");
}

main().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1); });
