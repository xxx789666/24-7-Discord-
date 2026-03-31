# dev-self-heal — 完成報告

## 建立檔案
`discord-lobster-master/self-heal.js`

## 架構摘要

### STATE_FILE
`data/self-heal-state.json` — 滾動保留最近 144 筆指標（10 分鐘間隔 × 144 = 24 小時）

### 每次執行採集的 6 項指標
| 欄位 | 說明 |
|---|---|
| `timestamp` | ISO 時間戳 |
| `heapMB` | Node.js heap 使用量（MB） |
| `dataDirKb` | data/ 目錄總大小（KB） |
| `webhookOk` | GENERAL_WEBHOOK_URL HEAD 請求是否成功 |
| `staleScripts` | 超過 2× 預期間隔未執行的腳本名稱陣列 |
| `errors` | 本次偵測到的問題清單 |

### Layer 1 — 偵測 6 種問題 + 自動修復
1. **Gemini RPD 超限**：偵測 `data/gemini-cooldown.lock`；若存在 > 24h 自動刪除
2. **Webhook 失效**：對 `GENERAL_WEBHOOK_URL` 發送 HEAD，6 秒 timeout
3. **記憶體超限**：heap > 500 MB 告警
4. **磁碟超限**：data/ > 100 MB（102400 KB）告警
5. **State JSON 損毀**：嘗試 JSON.parse 每個 .json 檔；損毀者重命名為 `.corrupt` 備份
6. **腳本停滯**：以 state 檔案 mtime 偵測，超過 `2 × 預期間隔` 視為停滯

### Layer 2 — Gemini 診斷
若 Layer 1 發現錯誤且 cooldown lock 不存在，呼叫 `geminiGenerate()` 取得繁體中文修復建議（≤ 100 字）

### Layer 3 — Telegram 告警
直接用 `https` 模組 POST 至 `api.telegram.org/bot<token>/sendMessage`，含 HTML 格式的指標快照 + 問題清單 + AI 診斷

## 環境變數需求（新增至 .env）
```
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_ADMIN_CHAT_ID=<your-chat-id>
```

## Crontab 設定
```cron
*/10 * * * * cd ~/arthur-bot && node discord-lobster-master/self-heal.js
```

## 語法驗證
`node --check discord-lobster-master/self-heal.js` — 通過（無輸出）
