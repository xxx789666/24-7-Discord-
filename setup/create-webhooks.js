#!/usr/bin/env node
/**
 * create-webhooks.js
 * 自動為所有頻道建立 Webhook 並更新 .env
 * 執行：node setup/create-webhooks.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../discord-lobster-master/.env');
const envVars = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const TOKEN = envVars.DISCORD_BOT_TOKEN;

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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function createWebhook(channelId, name) {
  const res = await apiRequest('POST', `/channels/${channelId}/webhooks`, { name });
  if (res.status === 200 || res.status === 201) {
    const url = `https://discord.com/api/webhooks/${res.body.id}/${res.body.token}`;
    console.log(`  ✅ ${name}: ${url}`);
    return url;
  } else {
    console.error(`  ❌ ${name} 失敗:`, JSON.stringify(res.body));
    return null;
  }
}

async function main() {
  console.log('\n🔗 開始建立 Webhook...\n');

  const channels = [
    { key: 'WELCOME_WEBHOOK_URL',      id: envVars.WELCOME_CHANNEL_ID,      name: 'Arthur-歡迎' },
    { key: 'GENERAL_WEBHOOK_URL',      id: envVars.GENERAL_CHANNEL_ID,      name: 'Arthur-General' },
    { key: 'NEWS_WEBHOOK_URL',         id: envVars.NEWS_CHANNEL_ID,         name: 'Arthur-匯率新聞' },
    { key: 'JAPAN_WEBHOOK_URL',        id: envVars.JAPAN_CHANNEL_ID,        name: 'Arthur-日本' },
    { key: 'THAI_WEBHOOK_URL',         id: envVars.THAI_CHANNEL_ID,         name: 'Arthur-泰國' },
    { key: 'DUBAI_WEBHOOK_URL',        id: envVars.DUBAI_CHANNEL_ID,        name: 'Arthur-杜拜' },
    { key: 'OTHERS_WEBHOOK_URL',       id: envVars.OTHERS_CHANNEL_ID,       name: 'Arthur-其他' },
    { key: 'ARTHUR_AGENT_WEBHOOK_URL', id: envVars.ARTHUR_AGENT_CHANNEL_ID, name: 'Arthur-Agent' },
    { key: 'BOT_LOGS_WEBHOOK_URL',     id: envVars.BOT_LOGS_CHANNEL_ID,     name: 'Arthur-Logs' },
  ];

  const updates = {};
  for (const ch of channels) {
    if (!ch.id) { console.log(`  ⚠️  跳過 ${ch.key}（頻道 ID 未設定）`); continue; }
    updates[ch.key] = await createWebhook(ch.id, ch.name);
    await sleep(400);
  }

  // 更新 .env
  let envContent = fs.readFileSync(envPath, 'utf8');
  for (const [key, url] of Object.entries(updates)) {
    if (!url) continue;
    envContent = envContent.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${url}`);
  }
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env 已自動更新 Webhook URL！\n');
}

main().catch(err => { console.error(err); process.exit(1); });
