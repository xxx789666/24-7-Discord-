# dev-research-chain — output

## 建立的檔案

`discord-lobster-master/research-chain.js`

## 功能摘要

| 步驟 | 實作 |
|------|------|
| RSS 抓取 | 3 個 Google News 來源（日本/泰國/杜拜），parallel fetch，每源最多 10 items |
| 去重 | `seenUrls` Set 過濾已處理 URL，每次最多 5 個新 URL |
| 全文提取 | Jina Reader `https://r.jina.ai/<encoded-url>`，截取前 3000 字 |
| Gemini 分析 | 每篇 1 次呼叫，提取 2–4 條海外置產重點見解（繁體中文） |
| 寫入 | 追加至 `~/.openclaw/workspace/intelligence/RESEARCH-NOTES.md`，格式：`## YYYY-MM-DD` + 每篇小節 |
| 狀態持久化 | `data/research-chain-state.json`，`seenUrls[]` slice(-500) |

## RPD 預算

- 每次執行最多 5 RPD（5 篇文章 × 1 Gemini call）
- 每日 2 次（05:00 + 17:00）= **~10 RPD/day**

## Cron 建議

```
0 5  * * * cd ~/arthur-bot && node discord-lobster-master/research-chain.js
0 17 * * * cd ~/arthur-bot && node discord-lobster-master/research-chain.js
```

## 語法檢查

`node --check` 通過，無錯誤。
