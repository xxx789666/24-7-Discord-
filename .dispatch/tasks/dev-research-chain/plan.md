# dev-research-chain — 新增 research-chain.js

- [x] 讀取 discord-lobster-master/lib/utils.js、lib/config.js、news.js 了解架構模式
- [x] 建立 discord-lobster-master/research-chain.js：
      STATE_FILE = data/research-chain-state.json（含 seenUrls[]）
      RSS 抓取 3 個來源（Google News 日本/泰國/杜拜）
      過濾已處理 URL（seen-urls 去重），每次最多處理 5 個新 URL
      Jina Reader 提取全文（https://r.jina.ai/<url>）
      Gemini 分析相關性與重點摘要
      更新 ~/.openclaw/workspace/intelligence/RESEARCH-NOTES.md
- [x] seenUrls 陣列 slice(-500) 防止無限成長
- [x] node --check discord-lobster-master/research-chain.js 確認語法
- [x] 寫入 .dispatch/tasks/dev-research-chain/output.md
