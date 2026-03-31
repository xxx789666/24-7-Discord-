# dev-self-heal — 新增 self-heal.js

- [x] 讀取 discord-lobster-master/lib/utils.js、lib/config.js 了解架構模式
- [x] 建立 discord-lobster-master/self-heal.js：
      STATE_FILE = data/self-heal-state.json（含 metrics[]，滾動 144 筆）
      Layer 1：偵測 6 種問題（Gemini RPD 超限、webhook 失效、記憶體、磁碟、node 程序異常、state JSON 損毀）
      Layer 2：Layer 1 失敗 → 收集錯誤 → Gemini 診斷
      Layer 3：診斷完成 → Telegram Bot API 推播告警給 TELEGRAM_ADMIN_CHAT_ID
      採集 6 項指標寫入 metrics（每次執行 append）
- [x] node --check discord-lobster-master/self-heal.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-self-heal/output.md
