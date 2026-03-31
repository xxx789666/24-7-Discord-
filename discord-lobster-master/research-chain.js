#!/usr/bin/env node
// research-chain.js — RSS → Jina Reader → Gemini → RESEARCH-NOTES.md
//
// Fetches Google News RSS for 3 overseas real estate markets, extracts full
// article text via Jina Reader, analyses each with Gemini, then appends
// insights to ~/.openclaw/workspace/intelligence/RESEARCH-NOTES.md.
//
// Run at 05:00 and 17:00 daily via cron. RPD budget: max 5/run × 2 = ~10/day.

const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");
const config = require("./lib/config");
const {
  log: _log, geminiGenerate,
  loadJson, saveJson,
} = require("./lib/utils");

const log = (msg) => _log("research-chain", msg);
const STATE_FILE = path.join(config.DATA_DIR, "research-chain-state.json");
const NOTES_FILE = path.join(os.homedir(), ".openclaw", "workspace", "intelligence", "RESEARCH-NOTES.md");

const MAX_NEW_URLS = 5;

const RSS_SOURCES = [
  {
    market: "日本不動產",
    url: "https://news.google.com/rss/search?q=%E6%97%A5%E6%9C%AC+%E4%B8%8D%E5%8B%95%E7%94%A2&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
  },
  {
    market: "泰國房地產",
    url: "https://news.google.com/rss/search?q=%E6%B3%B0%E5%9C%8B+%E6%88%BF%E5%9C%B0%E7%94%A2&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
  },
  {
    market: "杜拜房地產",
    url: "https://news.google.com/rss/search?q=%E6%9D%9C%E6%8B%9C+%E6%88%BF%E5%9C%B0%E7%94%A2&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
  },
];

// ── HTTP helper (follows one redirect, 15 s timeout) ─────────────────────────

function fetchUrl(url, extraHeaders) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ArthurBot/1.0)",
          ...(extraHeaders || {}),
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, extraHeaders).then(resolve).catch(reject);
        }
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ statusCode: res.statusCode, body: d }));
      },
    );
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ── RSS parsing ───────────────────────────────────────────────────────────────

function parseRssItems(xml, max) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < max) {
    const block = m[1];
    const titleMatch =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
      block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch =
      block.match(/<link>([\s\S]*?)<\/link>/) ||
      block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim()
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">"),
        link: linkMatch[1].trim(),
      });
    }
  }
  return items;
}

async function fetchRssItems(source) {
  try {
    const { body } = await fetchUrl(source.url);
    const items = parseRssItems(body, 10);
    log(`${source.market}: ${items.length} item(s) from RSS`);
    return items.map((it) => ({ ...it, market: source.market }));
  } catch (e) {
    log(`WARN: ${source.market} RSS failed — ${e.message}`);
    return [];
  }
}

// ── Jina Reader ───────────────────────────────────────────────────────────────

async function fetchArticleText(articleUrl) {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(articleUrl)}`;
  try {
    const { statusCode, body } = await fetchUrl(jinaUrl, { Accept: "text/plain" });
    if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
    // Jina returns full text; trim to 3000 chars to stay within Gemini token budget
    return body.slice(0, 3000).trim();
  } catch (e) {
    log(`WARN: Jina fetch failed for ${articleUrl} — ${e.message}`);
    return null;
  }
}

// ── Gemini analysis ───────────────────────────────────────────────────────────

async function analyseArticle(title, text, market) {
  const prompt =
    `你是 Arthur 海外置產研究助理。以下是一篇關於「${market}」的新聞文章。\n` +
    `標題：${title}\n\n` +
    `文章內容：\n${text}\n\n` +
    `請用繁體中文，從「台灣投資人海外置產」角度，提取 2–4 條重點見解。\n` +
    `格式：每條以「- 」開頭，簡短有力（每條不超過 60 字）。\n` +
    `若內容與海外置產無關，只輸出「- 與海外置產無直接關聯」。\n` +
    `只輸出見解條列，不需標題或說明。`;

  try {
    const result = await geminiGenerate(prompt);
    return result || "- （分析失敗）";
  } catch (e) {
    log(`WARN: Gemini failed for "${title}" — ${e.message}`);
    return "- （分析失敗）";
  }
}

// ── RESEARCH-NOTES.md writer ──────────────────────────────────────────────────

function appendToNotes(entries) {
  const dir = path.dirname(NOTES_FILE);
  fs.mkdirSync(dir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  let block = `\n## ${today}\n\n`;

  for (const { title, link, market, insights } of entries) {
    block += `### [${market}] ${title}\n`;
    block += `來源：${link}\n`;
    block += `${insights}\n\n`;
  }

  fs.appendFileSync(NOTES_FILE, block, "utf8");
  log(`Appended ${entries.length} entr(ies) to RESEARCH-NOTES.md`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const state = loadJson(STATE_FILE) || { seenUrls: [] };
  const seenSet = new Set(state.seenUrls);

  // 1. Fetch all RSS sources in parallel
  log("Fetching RSS sources…");
  const allItems = (await Promise.all(RSS_SOURCES.map(fetchRssItems))).flat();

  // 2. Filter to new URLs, cap at MAX_NEW_URLS
  const newItems = allItems.filter((it) => !seenSet.has(it.link)).slice(0, MAX_NEW_URLS);
  log(`${newItems.length} new URL(s) to process (cap: ${MAX_NEW_URLS})`);

  if (newItems.length === 0) {
    log("No new URLs — skipping");
    process.exit(0);
  }

  // 3. For each new item: Jina extract → Gemini analyse (sequential to stay polite)
  const entries = [];
  for (const item of newItems) {
    log(`Processing: ${item.title}`);

    const text = await fetchArticleText(item.link);
    if (!text) {
      log(`Skipping (no text): ${item.link}`);
      seenSet.add(item.link); // mark seen to avoid re-trying broken URLs
      continue;
    }

    const insights = await analyseArticle(item.title, text, item.market);
    entries.push({ title: item.title, link: item.link, market: item.market, insights });
    seenSet.add(item.link);
    log(`Done: ${item.title.slice(0, 50)}`);
  }

  // 4. Append to RESEARCH-NOTES.md
  if (entries.length > 0) {
    appendToNotes(entries);
  }

  // 5. Save state (cap seenUrls to last 500)
  state.seenUrls = [...seenSet].slice(-500);
  saveJson(STATE_FILE, state);
  log(`Done. seenUrls count=${state.seenUrls.length}`);
}

main().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1); });
