# dev-tg-commander — 完成報告

## 建立檔案
`discord-lobster-master/tg-commander.js` — 276 行，零 npm 依賴

## 實作內容

### 長輪詢架構
- `tgGet("getUpdates", { offset, timeout: 30 })` — 30 秒長輪詢
- `offset = last_update_id + 1` — 避免重複處理
- 網路錯誤指數退避：1s → 2s → 4s … → max 60s

### 安全性
- 每條訊息驗證 `chat.id === TELEGRAM_ADMIN_CHAT_ID`
- 非管理員訊息靜默忽略（僅記錄 log）
- Bot username suffix 自動剝離（`/help@BotName` → `/help`）

### 8 個指令

| 指令 | 行為 |
|------|------|
| `/status` | 讀取 9 個 state JSON 的 `lastRun`，顯示暫停狀態 |
| `/spawn <market> <content>` | 驗證市場（japan/thai/dubai/others），append 至 `data/spawn-queue.json` |
| `/pause` | 建立 `data/pause.lock`（冪等，重複執行有提示） |
| `/resume` | 刪除 `data/pause.lock`（冪等） |
| `/report` | 掃描 state 檔案 mtime 估算今日 RPD，顯示佔比與上限 |
| `/heal` | 讀取 `self-heal-state.json`，回報 checks/errors/healed |
| `/stats` | 成員數（member-memory.json）、互動數（arthur-agent-state）、spawn 佇列 |
| `/help` | 繁體中文完整指令說明 |

### 優雅關閉
- `SIGTERM` / `SIGINT` → 等待 500ms 讓 in-flight poll 完成 → `process.exit(0)`

### 啟動通知
- 啟動時向管理員發送 `🚀 Arthur tg-commander 已啟動` 訊息

## .env 需新增

```
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_ADMIN_CHAT_ID=<your Telegram user/chat ID>
```

## 執行方式（常駐服務）

```bash
# 背景執行（WSL2）
nohup node discord-lobster-master/tg-commander.js >> logs/tg-commander.log 2>&1 &
```

## 語法檢查
```
node --check discord-lobster-master/tg-commander.js → SYNTAX OK
```
