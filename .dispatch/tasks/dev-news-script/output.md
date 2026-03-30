# dev-news-script — 完成報告

## 建立檔案

### `discord-lobster-master/news.js`
每日 09:00 執行的日報腳本：
- **匯率**：呼叫 `https://open.er-api.com/v6/latest/TWD`（免費，無需 API Key），取得 100 JPY、1 THB、1 AED 對應台幣值
- **新聞**：並行抓取 3 個 Google News RSS（日本/泰國/杜拜），每市場最多 3 則，以 regex 解析 `<item>` / `<title>` / `<link>`，零 npm 依賴
- **Gemini**：1 次呼叫（~1 RPD/天），將匯率 + 新聞彙整為 Discord 晨報貼文
- **防重複**：`state.lastRun` 記錄日期，當日已執行則 `process.exit(0)` 跳過
- **STATE_FILE**：`data/news-state.json`（`lastRun`, `postedIds`）
- **log prefix**：`news`
- **Webhook**：`config.NEWS_WEBHOOK_URL`

### `discord-lobster-master/lib/config.js`（修改）
新增一行：
```js
NEWS_WEBHOOK_URL: required("NEWS_WEBHOOK_URL"),
```

## .env 需補上
```
NEWS_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## crontab 範例
```
0 9 * * * cd ~/arthur-bot && node discord-lobster-master/news.js >> logs/news-cron.log 2>&1
```

## RPD 統計
| 操作 | 次數/天 |
|------|---------|
| Gemini generateContent | 1 |
| open.er-api.com | 1 |
| Google News RSS | 3 |

合計 Gemini: **1 RPD/天**（遠低於 ~8 RPD 預算）
