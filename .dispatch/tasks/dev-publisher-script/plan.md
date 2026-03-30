# dev-publisher-script — 新增 publisher.js

- [x] 讀取 discord-lobster-master/lib/config.js、lib/utils.js、welcome.js 了解架構模式
- [x] 建立 discord-lobster-master/publisher.js：
      STATE_FILE = data/publisher-state.json
      輪詢 SPAWN_CHANNEL_ID 頻道，偵測以 /SPAWN 開頭的訊息
      解析市場代碼（japan/thai/dubai/others）與原始內容
      讀取 POST-PERFORMANCE.md 與 COMPETITOR-INTEL.md（路徑不存在則略過）
      Quality Gate：generate → Gemini 自評 1-10 → <7 重試最多 2 次 → 仍失敗存入 drafts/ → 通過才 postWebhook()
      對應 Webhook：JAPAN/THAI/DUBAI/OTHERS_WEBHOOK_URL
- [x] 確認 config.js 匯出所有需要的變數（SPAWN_CHANNEL_ID、市場 Webhooks）
- [x] node --check discord-lobster-master/publisher.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-publisher-script/output.md
