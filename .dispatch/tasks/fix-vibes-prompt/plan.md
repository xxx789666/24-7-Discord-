# fix-vibes-prompt — vibes.js Arthur 人格 + RESEARCH-NOTES 讀取

- [x] 讀取 discord-lobster-master/vibes.js 了解現有 prompt 與邏輯
- [x] 將 prompt 改為 Arthur 房產顧問人格（適時插話、分享市場知識）
- [x] 加入在生成前讀取 ~/.openclaw/workspace/intelligence/RESEARCH-NOTES.md 的邏輯（fs.readFileSync，檔案不存在則略過）
- [x] 補入三行 prompt 防禦語句
- [x] node --check discord-lobster-master/vibes.js 確認語法
- [x] 寫入 .dispatch/tasks/fix-vibes-prompt/output.md
