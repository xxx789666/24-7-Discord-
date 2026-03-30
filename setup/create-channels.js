#!/usr/bin/env node
/**
 * create-channels.js
 * 自動建立 Arthur 海外置產 Discord 伺服器所有頻道與分類
 * 執行：node setup/create-channels.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 手動解析 .env（零依賴）
const envPath = path.join(__dirname, '../discord-lobster-master/.env');
const envVars = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const TOKEN = envVars.DISCORD_BOT_TOKEN;
const GUILD_ID = envVars.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('❌ 缺少 DISCORD_BOT_TOKEN 或 GUILD_ID，請確認 .env 設定');
  process.exit(1);
}

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'discord.com',
      path: `/api/v10${endpoint}`,
      method,
      headers: {
        'Authorization': `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function createCategory(name) {
  const res = await apiRequest('POST', `/guilds/${GUILD_ID}/channels`, {
    name,
    type: 4 // GUILD_CATEGORY
  });
  if (res.status === 201) {
    console.log(`  📂 分類建立：${name} (${res.body.id})`);
    return res.body.id;
  } else {
    console.error(`  ❌ 分類失敗：${name}`, res.body);
    return null;
  }
}

async function createChannel(name, categoryId, isPrivate = false) {
  const body = {
    name,
    type: 0, // GUILD_TEXT
    parent_id: categoryId,
  };
  if (isPrivate) {
    body.permission_overwrites = [
      {
        id: GUILD_ID, // @everyone
        type: 0,
        deny: '1024' // VIEW_CHANNEL
      }
    ];
  }
  const res = await apiRequest('POST', `/guilds/${GUILD_ID}/channels`, body);
  if (res.status === 201) {
    console.log(`    #${name} (${res.body.id})`);
    return res.body;
  } else {
    console.error(`    ❌ 頻道失敗：${name}`, res.body);
    return null;
  }
}

async function main() {
  console.log(`\n🚀 開始建立 Arthur 伺服器頻道結構...\n`);
  console.log(`Guild ID: ${GUILD_ID}\n`);

  const results = {};

  // ── 🌏 START HERE ──────────────────────────────────
  console.log('建立分類：🌏 START HERE');
  const startHere = await createCategory('🌏 START HERE');
  await sleep(500);
  await createChannel('歡迎與規則', startHere);
  await sleep(300);
  await createChannel('自我介紹', startHere);
  await sleep(500);

  // ── 🏠 熱門市場 ─────────────────────────────────────
  console.log('\n建立分類：🏠 熱門市場');
  const hotMarket = await createCategory('🏠 熱門市場');
  await sleep(500);
  results.japan = await createChannel('日本不動產', hotMarket);
  await sleep(300);
  results.thai = await createChannel('泰國不動產', hotMarket);
  await sleep(300);
  results.dubai = await createChannel('阿聯酋-杜拜', hotMarket);
  await sleep(300);
  results.others = await createChannel('其他海外物件', hotMarket);
  await sleep(500);

  // ── 📊 市場資訊 ──────────────────────────────────────
  console.log('\n建立分類：📊 市場資訊');
  const marketInfo = await createCategory('📊 市場資訊');
  await sleep(500);
  results.news = await createChannel('匯率', marketInfo);
  await sleep(300);
  results.policy = await createChannel('政策追蹤', marketInfo);
  await sleep(300);
  await createChannel('市場週報', marketInfo);
  await sleep(500);

  // ── 🦞 Ask 海外置產顧問 ──────────────────────────────
  console.log('\n建立分類：🦞 Ask 海外置產顧問');
  const askArthur = await createCategory('🦞 Ask 海外置產顧問');
  await sleep(500);
  results.arthur = await createChannel('ask-arthur-agent', askArthur);
  await sleep(500);

  // ── 💬 社群討論 ──────────────────────────────────────
  console.log('\n建立分類：💬 社群討論');
  const community = await createCategory('💬 社群討論');
  await sleep(500);
  await createChannel('買房經驗分享', community);
  await sleep(300);
  await createChannel('法律稅務討論', community);
  await sleep(300);
  results.inquiry = await createChannel('洽詢預約', community);
  await sleep(500);

  // ── 🔒 VIP 專屬 ──────────────────────────────────────
  console.log('\n建立分類：🔒 VIP 專屬');
  const vip = await createCategory('🔒 VIP 專屬');
  await sleep(500);
  await createChannel('vip-物件優先看', vip, true);
  await sleep(500);

  // ── ⚙️ 管理後台（隱藏）──────────────────────────────
  console.log('\n建立分類：⚙️ 管理後台');
  const admin = await createCategory('⚙️ 管理後台');
  await sleep(500);
  results.botLogs = await createChannel('bot-logs', admin, true);
  await sleep(300);
  await createChannel('admin', admin, true);
  await sleep(300);
  results.spawn = await createChannel('手動推文', admin, true);
  await sleep(300);

  // ── 輸出頻道 ID 摘要 ────────────────────────────────
  console.log('\n\n✅ 頻道建立完成！請將以下 ID 填入 .env：\n');
  const mapping = {
    WELCOME_CHANNEL_ID: '歡迎與規則（需手動查詢）',
    GENERAL_CHANNEL_ID: '日本不動產（作為預設 general）',
    NEWS_CHANNEL_ID:    results.news?.id     || '（查詢頻道 ID）',
    SPAWN_CHANNEL_ID:   results.spawn?.id    || '（查詢頻道 ID）',
    ARTHUR_AGENT_CHANNEL_ID: results.arthur?.id || '（查詢頻道 ID）',
    BOT_LOGS_WEBHOOK_URL: results.botLogs?.id || '（查詢頻道 ID）',
    JAPAN_WEBHOOK_URL:  results.japan?.id    || '（查詢頻道 ID）',
    THAI_WEBHOOK_URL:   results.thai?.id     || '（查詢頻道 ID）',
    DUBAI_WEBHOOK_URL:  results.dubai?.id    || '（查詢頻道 ID）',
    OTHERS_WEBHOOK_URL: results.others?.id   || '（查詢頻道 ID）',
  };
  for (const [key, val] of Object.entries(mapping)) {
    console.log(`  ${key}=${val}`);
  }
  console.log('\n⚠️  Webhook URL 需要到 Discord → 頻道設定 → 整合 → Webhook 手動建立\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
