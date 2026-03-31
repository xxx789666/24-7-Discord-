# dev-weekly-strategy — 新增 weekly-strategy.js

- [x] 讀取 discord-lobster-master/lib/utils.js、lib/config.js 了解架構模式
- [x] 建立 discord-lobster-master/weekly-strategy.js：
      讀取 POST-PERFORMANCE.md、COMPETITOR-INTEL.md、RESEARCH-NOTES.md、WISDOM.md
      三視角各呼叫 Gemini（市場趨勢 / 社群互動 / 法規政策）各提出 3 個優先項目
      Arthur 統整成下週內容計畫
      寫入 ~/.openclaw/workspace/intelligence/WEEKLY-STRATEGY.md
      發布週報摘要至 Discord（GENERAL_WEBHOOK_URL）
      RPD 預算 ~5/次（每週日 12:00 執行）
- [x] node --check discord-lobster-master/weekly-strategy.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-weekly-strategy/output.md
