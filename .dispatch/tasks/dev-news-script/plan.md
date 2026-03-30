# dev-news-script — 新增 news.js

- [x] 讀取 discord-lobster-master/lib/config.js、lib/utils.js、welcome.js 了解架構模式
- [x] 建立 discord-lobster-master/news.js：
      STATE_FILE = data/news-state.json
      抓取匯率（JPY/THB/AED → TWD，用 exchangerate-api 或免費 API）
      彙整海外房產政策新聞（Google News RSS，解析 XML）
      格式化後透過 postWebhook() 發送至 NEWS_WEBHOOK_URL
      RPD 預算 2 次 Gemini 呼叫（匯率摘要 + 新聞彙整）
- [x] 確認 config.js 已匯出 NEWS_WEBHOOK_URL（若無則在 config.js 補上）
- [x] node --check discord-lobster-master/news.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-news-script/output.md
