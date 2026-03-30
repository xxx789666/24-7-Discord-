# extend-memory-fields — memory.js 欄位擴充

- [x] 讀取 discord-lobster-master/memory.js 了解現有 member profile schema 與 state 讀寫方式
- [x] 在 member profile 物件新增欄位：threadDepth（物件）、targetMarket（陣列）、lastSeen（字串）
- [x] 確認 state 陣列有 slice(-300) 上限
- [x] 更新 Gemini prompt 以萃取 targetMarket 資訊
- [x] node --check discord-lobster-master/memory.js 確認語法
- [x] 寫入 .dispatch/tasks/extend-memory-fields/output.md
