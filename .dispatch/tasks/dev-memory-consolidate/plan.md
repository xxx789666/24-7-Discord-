# dev-memory-consolidate — 新增 memory-consolidate.js

- [x] 讀取 discord-lobster-master/lib/utils.js、lib/config.js、memory.js 了解架構模式
- [x] 建立 discord-lobster-master/memory-consolidate.js：
      讀取 data/member-memory.json
      讀取本週活動紀錄（整合各 state JSON 的最近互動）
      Gemini 萃取洞察：常見問題、熱門市場、成員輪廓趨勢
      更新 ~/.openclaw/workspace/intelligence/WISDOM.md（append 本週洞察，保留歷史）
      RPD 預算 ~5/次（每週日 23:00 執行）
- [x] node --check discord-lobster-master/memory-consolidate.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-memory-consolidate/output.md
