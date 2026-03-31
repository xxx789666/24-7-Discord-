# dev-tg-commander — 新增 tg-commander.js

- [x] 讀取 discord-lobster-master/lib/utils.js、lib/config.js 了解架構模式
- [x] 建立 discord-lobster-master/tg-commander.js：
      長輪詢 Telegram Bot API（getUpdates offset 追蹤）
      實作 8 個指令：
        /status  — 回報各腳本最後執行時間與狀態
        /spawn   — 觸發 publisher.js 邏輯（需帶市場代碼與內容）
        /pause   — 寫入 data/pause.lock 檔案（腳本偵測後跳過執行）
        /resume  — 刪除 data/pause.lock
        /report  — 回報今日 RPD 使用量估算
        /heal    — 手動觸發 self-heal.js
        /stats   — 回報成員數、今日互動數
        /help    — 列出所有指令說明
      僅允許 TELEGRAM_ADMIN_CHAT_ID 的訊息
- [x] node --check discord-lobster-master/tg-commander.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-tg-commander/output.md
