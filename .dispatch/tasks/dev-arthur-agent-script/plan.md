# dev-arthur-agent-script — 新增 arthur-agent.js

- [x] 讀取 discord-lobster-master/lib/config.js、lib/utils.js、memory.js 了解架構模式（特別是 discordApi() 讀取訊息）
- [x] 建立 discord-lobster-master/arthur-agent.js：
      STATE_FILE = data/arthur-agent-state.json（含 threadDepth、processedMsgIds）
      輪詢 ARTHUR_AGENT_CHANNEL_ID，讀取最新訊息
      過濾：只處理 @Arthur 提及 或 thread 回覆
      threadDepth 追蹤：每串 max 2 則回覆，每次執行 max 5 則（防 Discord 反垃圾）
      讀取 data/member-memory.json 個人化回覆
      Arthur 深度問答 prompt（房地產顧問 + 防禦語句）
      透過 ARTHUR_AGENT_WEBHOOK_URL postWebhook()
- [x] 確認 config.js 匯出 ARTHUR_AGENT_CHANNEL_ID、ARTHUR_AGENT_WEBHOOK_URL
- [x] node --check discord-lobster-master/arthur-agent.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-arthur-agent-script/output.md
