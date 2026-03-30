#!/usr/bin/env node
// news.js — Daily exchange rates + overseas real estate policy news
//
// Fetches JPY/THB/AED exchange rates vs TWD and Google News RSS for 3 markets,
// formats everything into a single Discord post via one Gemini call.
//
// Run at 09:00 daily via cron. RPD budget: ~1/day.

const path = require("path");
const https = require("https");
const config = require("./lib/config");
const {
  log: _log, geminiGenerate, postWebhook,
  loadJson, saveJson,
} = require("./lib/utils");

const log = (msg) => _log("news", msg);
const STATE_FILE = path.join(config.DATA_DIR, "news-state.json");

// ── HTTP helper (follows one redirect, 10 s timeout) ─────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ArthurBot/1.0)" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ── Exchange rates ────────────────────────────────────────────────────────────

async function fetchExchangeRates() {
  const body = await fetchUrl("https://open.er-api.com/v6/latest/TWD");
  const data = JSON.parse(body);
  if (data.result !== "success") throw new Error(`Exchange rate API: ${data["error-type"] || "unknown error"}`);
  const r = data.rates;
  // Base is TWD → r.JPY = JPY per 1 TWD → 1 JPY = 1/r.JPY TWD
  return {
    JPY: (100 / r.JPY).toFixed(2),   // 100 JPY in TWD
    THB: (1 / r.THB).toFixed(3),     // 1 THB in TWD
    AED: (1 / r.AED).toFixed(2),     // 1 AED in TWD
  };
}

// ── RSS parsing (zero npm deps) ───────────────────────────────────────────────

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
        title: titleMatch[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
        link: linkMatch[1].trim(),
      });
    }
  }
  return items;
}

async function fetchNewsItems(url, market, max) {
  try {
    const xml = await fetchUrl(url);
    const items = parseRssItems(xml, max);
    log(`${market}: fetched ${items.length} item(s)`);
    return items;
  } catch (e) {
    log(`WARN: ${market} news fetch failed — ${e.message}`);
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const state = loadJson(STATE_FILE) || { lastRun: null, postedIds: [] };
  const today = new Date().toISOString().slice(0, 10);

  if (state.lastRun === today) {
    log("Already ran today — skipping");
    process.exit(0);
  }

  // 1. Exchange rates
  log("Fetching exchange rates…");
  let rates;
  try {
    rates = await fetchExchangeRates();
    log(`Rates: 100 JPY=${rates.JPY} TWD | 1 THB=${rates.THB} TWD | 1 AED=${rates.AED} TWD`);
  } catch (e) {
    log(`ERROR fetching rates: ${e.message}`);
    process.exit(1);
  }

  // 2. News (3 markets in parallel, max 3 items each)
  log("Fetching news RSS…");
  const [japanNews, thaiNews, dubaiNews] = await Promise.all([
    fetchNewsItems(
      "https://news.google.com/rss/search?q=%E6%97%A5%E6%9C%AC+%E4%B8%8D%E5%8B%95%E7%94%A2&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
      "Japan", 3,
    ),
    fetchNewsItems(
      "https://news.google.com/rss/search?q=%E6%B3%B0%E5%9C%8B+%E6%88%BF%E5%9C%B0%E7%94%A2&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
      "Thailand", 3,
    ),
    fetchNewsItems(
      "https://news.google.com/rss/search?q=%E6%9D%9C%E6%8B%9C+%E6%88%BF%E5%9C%B0%E7%94%A2&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
      "Dubai", 3,
    ),
  ]);

  // 3. Build Gemini prompt (1 call)
  const rateBlock =
    `匯率（今日 ${today}）：\n` +
    `  100 日圓 (JPY) = ${rates.JPY} 台幣\n` +
    `  1 泰銖 (THB)   = ${rates.THB} 台幣\n` +
    `  1 迪拉姆 (AED) = ${rates.AED} 台幣`;

  function formatMarket(label, items) {
    if (items.length === 0) return `${label}\n（今日暫無新聞）`;
    return `${label}\n` +
      items.map((it, i) => `${i + 1}. ${it.title}\n   ${it.link}`).join("\n");
  }

  const newsBlock = [
    formatMarket("🇯🇵 日本不動產", japanNews),
    formatMarket("🇹🇭 泰國房地產", thaiNews),
    formatMarket("🇦🇪 杜拜房地產", dubaiNews),
  ].join("\n\n");

  const prompt =
    `你是 Arthur 海外置產社群的日報助理，用繁體中文撰寫。\n` +
    `請把以下資料整理成一則 Discord 晨報（限 700 字以內）：\n\n` +
    `${rateBlock}\n\n${newsBlock}\n\n` +
    `格式要求：\n` +
    `- 開頭一行固定為「🌅 Arthur 海外置產日報 · ${today}」\n` +
    `- 匯率用清單呈現，加一句趨勢評語\n` +
    `- 每則新聞用一句話說明對海外買房者的實際影響，保留原始連結\n` +
    `- 結尾一句激勵語\n` +
    `- 只輸出貼文內容，不需任何說明或標題`;

  log("Calling Gemini (1 RPD)…");
  let post;
  try {
    post = await geminiGenerate(prompt);
    if (!post) throw new Error("Empty Gemini response");
    log(`Generated ${post.length} chars`);
  } catch (e) {
    log(`ERROR Gemini: ${e.message}`);
    process.exit(1);
  }

  // 4. Post to Discord
  log("Posting to NEWS_WEBHOOK_URL…");
  try {
    const status = await postWebhook(config.NEWS_WEBHOOK_URL, post);
    log(`Webhook status=${status}`);
  } catch (e) {
    log(`ERROR posting webhook: ${e.message}`);
    process.exit(1);
  }

  // 5. Save state
  state.lastRun = today;
  state.postedIds = (state.postedIds || []).slice(-300);
  saveJson(STATE_FILE, state);
  log("Done");
}

main().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1); });
