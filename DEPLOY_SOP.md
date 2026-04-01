# Arthur Bot — 快速部署 SOP (Claude Code 專用)

> 本文件供 Claude Code 在新環境重新部署 Arthur Bot 使用。
> 按步驟執行，每步驟完成後確認再繼續。

---

## 事前準備清單 / Pre-requisites Checklist

在開始部署前，請確認已備妥以下所有帳號與資訊：

### 1. Discord 設定

- [ ] **Discord Bot Token** — 至 [Discord Developer Portal](https://discord.com/developers/applications) 建立 Bot，啟用以下 Intents：
  - `MESSAGE CONTENT INTENT` ✅
  - `SERVER MEMBERS INTENT` ✅
  - `PRESENCE INTENT` ✅
- [ ] **Guild ID** — 右鍵點選伺服器 → 複製伺服器 ID（需開啟開發者模式）
- [ ] **Bot User ID** — 在 Bot 設定頁面取得
- [ ] Bot 已加入目標伺服器，且具有以下權限：
  - `Read Messages / View Channels`
  - `Send Messages`
  - `Read Message History`
  - `Add Reactions`
  - `Manage Messages`（可選，用於清除 reaction）
  - `Use Slash Commands`

### 2. Gemini API 設定

- [ ] **GEMINI_API_KEY** — 至 [Google AI Studio](https://aistudio.google.com/apikeys) 建立 (**必須從 AI Studio 建立，不能從 GCP Console 建立**，否則 thinking tokens 無速率上限會超額)
- [ ] **GEMINI_API_KEY_2**（可選）— 備援 Key，輪替用
- [ ] **GEMINI_API_KEY_GCP**（可選）— GCP 付費 Key，專用於 arthur-agent.js 高負載場景

### 3. Telegram 設定（可選，但強烈建議）

- [ ] **TELEGRAM_BOT_TOKEN** — 向 [@BotFather](https://t.me/BotFather) 發送 `/newbot` 建立
- [ ] **TELEGRAM_ADMIN_CHAT_ID** — 向 [@userinfobot](https://t.me/userinfobot) 取得你的 Chat ID

### 4. Discord Webhooks（各頻道需各自建立）

每個 Webhook 在 Discord 頻道設定 → 整合 → Webhook → 建立 Webhook：

| 變數名 | 對應頻道 | 必要性 |
|--------|----------|--------|
| `WELCOME_WEBHOOK_URL` | #welcome | 必要 |
| `GENERAL_WEBHOOK_URL` | #一般閒聊 | 必要 |
| `NEWS_WEBHOOK_URL` | #匯率 | 必要 |
| `ARTHUR_AGENT_WEBHOOK_URL` | #ask-arthur-agent | 必要 |
| `POLICY_WEBHOOK_URL` | #房市新聞 | 建議 |
| `BOTLOGS_WEBHOOK_URL` | #bot-logs | 建議 |
| `JAPAN_WEBHOOK_URL` | #japan | 可選 |
| `THAI_WEBHOOK_URL` | #thailand | 可選 |
| `DUBAI_WEBHOOK_URL` | #dubai | 可選 |
| `OTHERS_WEBHOOK_URL` | #others | 可選 |

### 5. Discord Channel IDs（右鍵頻道 → 複製頻道 ID）

| 變數名 | 說明 |
|--------|------|
| `WELCOME_CHANNEL_ID` | #welcome 頻道 ID |
| `GENERAL_CHANNEL_ID` | #general 頻道 ID |
| `ARTHUR_AGENT_CHANNEL_ID` | #ask-arthur-agent 頻道 ID |
| `JAPAN_CHANNEL_ID` | #japan 頻道 ID（可選） |
| `THAI_CHANNEL_ID` | #thailand 頻道 ID（可選） |
| `DUBAI_CHANNEL_ID` | #dubai 頻道 ID（可選） |
| `OTHERS_CHANNEL_ID` | #others 頻道 ID（可選） |

---

## 部署步驟 / Deployment Steps

### Step 1: 環境安裝

```bash
# 1.1 安裝 Node.js 20 LTS via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version  # 應顯示 v20.x.x

# 1.2 驗證 cron 可用
which cron || sudo apt-get install -y cron
sudo service cron start
sudo service cron status  # 應顯示 active
```

### Step 2: WSL2 開機自動啟動 cron

```bash
# 設定 WSL2 開機自動啟動 cron
sudo tee -a /etc/wsl.conf <<'EOF'
[boot]
command = service cron start
EOF
```

### Step 3: 複製專案

```bash
# 建立工作目錄
mkdir -p ~/arthur-bot
cd ~/arthur-bot

# 複製專案（從 GitHub）
git clone https://github.com/xxx789666/24-7-Discord- discord-lobster-master
# 或從 Windows 路徑複製（WSL2）
# cp -r /mnt/c/Users/USER/Desktop/自動化discord專案/discord-lobster-master ~/arthur-bot/

# 建立必要目錄
mkdir -p ~/arthur-bot/logs ~/arthur-bot/pids
mkdir -p ~/arthur-bot/discord-lobster-master/data
mkdir -p ~/arthur-bot/discord-lobster-master/logs
```

### Step 4: 建立 .env 設定檔

```bash
cat > ~/arthur-bot/discord-lobster-master/.env <<'EOF'
# ── Discord ──────────────────────────────────────────────
DISCORD_BOT_TOKEN=你的_Discord_Bot_Token
GUILD_ID=你的_伺服器_ID
ARTHUR_BOT_USER_ID=你的_Bot_User_ID

# ── Channel IDs ───────────────────────────────────────────
WELCOME_CHANNEL_ID=
GENERAL_CHANNEL_ID=
ARTHUR_AGENT_CHANNEL_ID=

# ── Webhooks (必要) ───────────────────────────────────────
WELCOME_WEBHOOK_URL=
GENERAL_WEBHOOK_URL=
NEWS_WEBHOOK_URL=
ARTHUR_AGENT_WEBHOOK_URL=

# ── Webhooks (建議) ───────────────────────────────────────
POLICY_WEBHOOK_URL=
BOTLOGS_WEBHOOK_URL=

# ── 市場頻道 Webhooks (可選) ──────────────────────────────
JAPAN_WEBHOOK_URL=
JAPAN_CHANNEL_ID=
THAI_WEBHOOK_URL=
THAI_CHANNEL_ID=
DUBAI_WEBHOOK_URL=
DUBAI_CHANNEL_ID=
OTHERS_WEBHOOK_URL=
OTHERS_CHANNEL_ID=

# ── Gemini API ────────────────────────────────────────────
GEMINI_API_KEY=你的_Gemini_API_Key
GEMINI_API_KEY_2=        # 備援 Key（可選）

# ── Telegram 遠端控制 ──────────────────────────────────────
TELEGRAM_BOT_TOKEN=你的_Telegram_Bot_Token
TELEGRAM_ADMIN_CHAT_ID=你的_Telegram_Chat_ID

# ── Bot 外觀 ──────────────────────────────────────────────
BOT_NAME=Arthur 🏠
BOT_AVATAR_URL=          # 可選，Bot 頭像 URL
EOF
```

**重要**: 用真實值替換所有 `你的_...` 佔位符。

### Step 5: 設定 Arthur 身分檔案

```bash
# 建立 OpenClaw workspace
mkdir -p ~/.openclaw/workspace/intelligence

# 建立 IDENTITY.md（Arthur 的人設與背景）
cat > ~/.openclaw/workspace/IDENTITY.md <<'EOF'
# Arthur 身分說明

我是 Arthur，我們公司的 24/7 AI 分身。
我們公司創辦人與夥伴已從事海外房產經營已有 10 年以上的經歷。

## 當有人詢問「從事幾年經驗」時
回覆：「我們公司創辦人與夥伴在海外房地產領域已深耕超過 10 年，
具備豐富的日本、泰國、杜拜市場實戰經驗。」

## 專業範圍
- 日本不動產（東京、大阪、福岡）
- 泰國房地產（曼谷、清邁、芭提雅）
- 杜拜/阿聯酋不動產
- 海外置產法規、稅制、簽證
- 外資購房限制與規定
EOF

# 初始化其他 intelligence 檔案
touch ~/.openclaw/workspace/intelligence/WISDOM.md
touch ~/.openclaw/workspace/intelligence/RESEARCH-NOTES.md
touch ~/.openclaw/workspace/intelligence/POST-PERFORMANCE.md
touch ~/.openclaw/workspace/intelligence/COMPETITOR-INTEL.md
```

### Step 6: 測試基本連線

```bash
cd ~/arthur-bot/discord-lobster-master

# 測試 Discord API 連線
node -e "
const config = require('./lib/config');
const { discordApi } = require('./lib/utils');
discordApi('GET', '/users/@me').then(r => console.log('Discord OK:', r.username)).catch(e => console.error('Discord FAIL:', e.message));
"

# 測試 Gemini API
node -e "
const { geminiGenerate } = require('./lib/utils');
geminiGenerate('說「測試成功」').then(r => console.log('Gemini OK:', r)).catch(e => console.error('Gemini FAIL:', e.message));
"
```

兩個測試都通過後才繼續。

### Step 7: 設定 crontab

```bash
# 取得 node 路徑
NODE_PATH=$(which node)
BOT_DIR="$HOME/arthur-bot/discord-lobster-master"
LOG_DIR="$HOME/arthur-bot/logs"

# 安裝 cron 排程
crontab -l 2>/dev/null > /tmp/current-cron.txt

cat >> /tmp/current-cron.txt <<EOF

# ── Arthur Bot ────────────────────────────────────────────
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin

*/3  * * * * cd ~/arthur-bot && $NODE_PATH $BOT_DIR/welcome.js >> $LOG_DIR/welcome.log 2>&1
*/20 * * * * cd ~/arthur-bot && $NODE_PATH $BOT_DIR/vibes.js >> $LOG_DIR/vibes.log 2>&1
*/10 * * * * cd ~/arthur-bot && $NODE_PATH $BOT_DIR/memory.js >> $LOG_DIR/memory.log 2>&1
*/10 * * * * cd ~/arthur-bot && $NODE_PATH $BOT_DIR/self-heal.js >> $LOG_DIR/self-heal.log 2>&1
0 5  * * * cd ~/arthur-bot && $NODE_PATH $BOT_DIR/research-chain.js >> $LOG_DIR/research-chain.log 2>&1
0 9  * * * cd ~/arthur-bot && $NODE_PATH $BOT_DIR/news.js >> $LOG_DIR/news.log 2>&1
0 17 * * * cd ~/arthur-bot && $NODE_PATH $BOT_DIR/research-chain.js >> $LOG_DIR/research-chain.log 2>&1
0 12 * * 0 cd ~/arthur-bot && $NODE_PATH $BOT_DIR/weekly-strategy.js >> $LOG_DIR/weekly-strategy.log 2>&1
0 23 * * 0 cd ~/arthur-bot && $NODE_PATH $BOT_DIR/memory-consolidate.js >> $LOG_DIR/memory-consolidate.log 2>&1
5 0  * * * find $LOG_DIR -name "*.log" -mtime +7 -exec truncate -s 0 {} \;
EOF

crontab /tmp/current-cron.txt
crontab -l  # 確認已安裝
```

### Step 8: 啟動常駐服務

```bash
cd ~/arthur-bot
bash setup/start-persistent.sh start

# 確認三個服務都啟動
bash setup/start-persistent.sh status
```

預期輸出：
```
✅ publisher  執行中（PID: xxxxx）
✅ arthur-agent  執行中（PID: xxxxx）
✅ tg-commander  執行中（PID: xxxxx）
```

### Step 9: 驗證系統運作

```bash
# 等待 3 分鐘讓 welcome.js 執行一次
sleep 180

# 檢查 log
tail -20 ~/arthur-bot/logs/welcome.log
tail -20 ~/arthur-bot/logs/arthur-agent.log
tail -20 ~/arthur-bot/logs/tg-commander.log

# 確認無 409 衝突（表示只有一個 tg-commander 在跑）
grep "409" ~/arthur-bot/logs/tg-commander.log | tail -5
```

### Step 10: Telegram 驗證

向 Telegram Bot 發送 `/status`，應收到各腳本執行時間報告。

向 Discord #admin 頻道發送 `!help`，應收到指令說明。

---

## 部署後日常維護 / Post-Deploy Maintenance

### 每次 Windows 重啟後

```bash
# WSL2 重啟後 cron 自動啟動（已設 /etc/wsl.conf），但常駐服務需手動重啟
bash ~/arthur-bot/setup/start-persistent.sh start
```

> **提示**: 若已設定 `/etc/wsl.conf` 的 `[boot] command = service cron start`，cron 會自動啟動，但 nohup 進程不會。每次開機需手動執行一次 `start`。

### 監控指令

```bash
# 系統狀態（快速）
bash ~/arthur-bot/setup/start-persistent.sh status

# API 用量
cat ~/arthur-bot/discord-lobster-master/data/rpd-counter.json | python3 -m json.tool

# 成員記憶檔案大小
wc -l ~/arthur-bot/discord-lobster-master/data/member-memory.json

# self-heal 最後報告
tail -30 ~/arthur-bot/discord-lobster-master/logs/self-heal.log
```

---

## 常見問題排解 / Troubleshooting

| 症狀 | 原因 | 解法 |
|------|------|------|
| tg-commander 409 Conflict | 多個實例在跑 | `pkill -f tg-commander.js && bash setup/start-persistent.sh start` |
| Bot 不回覆訊息 | arthur-agent 未啟動 | `bash setup/start-persistent.sh status` 確認 |
| Gemini 返回空回應 | RPD 超限或 API Key 失效 | 查看 `data/rpd-counter.json`，確認 Key 有效 |
| Log 顯示 401 | Discord Bot Token 失效 | 重新生成 Token 並更新 .env |
| 腳本不執行 | cron 未啟動 | `sudo service cron start` |
| 訊息過濾（不回應） | 訊息少於 5 字 | 正常行為，需較長問句 |

---

## 環境變數完整範本 / Complete .env Template

```bash
# 複製此範本，填入所有值後存為 .env

DISCORD_BOT_TOKEN=
GUILD_ID=
ARTHUR_BOT_USER_ID=

WELCOME_CHANNEL_ID=
GENERAL_CHANNEL_ID=
ARTHUR_AGENT_CHANNEL_ID=
JAPAN_CHANNEL_ID=
THAI_CHANNEL_ID=
DUBAI_CHANNEL_ID=
OTHERS_CHANNEL_ID=

WELCOME_WEBHOOK_URL=
GENERAL_WEBHOOK_URL=
NEWS_WEBHOOK_URL=
ARTHUR_AGENT_WEBHOOK_URL=
POLICY_WEBHOOK_URL=
BOTLOGS_WEBHOOK_URL=
JAPAN_WEBHOOK_URL=
THAI_WEBHOOK_URL=
DUBAI_WEBHOOK_URL=
OTHERS_WEBHOOK_URL=

GEMINI_API_KEY=
GEMINI_API_KEY_2=

TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=

BOT_NAME=Arthur 🏠
BOT_AVATAR_URL=
```

---

## 部署檢查清單 / Final Deployment Checklist

- [ ] Node.js 20 已安裝（`node --version`）
- [ ] cron 已啟動（`sudo service cron status`）
- [ ] `/etc/wsl.conf` 已設定開機自動啟動 cron
- [ ] `.env` 所有必要變數已填入
- [ ] `IDENTITY.md` 已建立（Arthur 身分設定）
- [ ] Discord API 連線測試通過
- [ ] Gemini API 連線測試通過
- [ ] crontab 已安裝（`crontab -l` 確認）
- [ ] 三個常駐服務已啟動（`start-persistent.sh status`）
- [ ] Telegram `/status` 有回應
- [ ] Discord #admin `!help` 有回應
- [ ] self-heal.js 執行一次（10分鐘後確認 `self-heal-state.json` 存在）

---

*最後更新: 2026-04-01*
