# dev-weekly-strategy — 完成報告

## 建立檔案

`discord-lobster-master/weekly-strategy.js`

## 功能摘要

- **執行時機**：每週日 12:00（cron: `0 12 * * 0`）
- **RPD 預算**：4 次 Gemini 呼叫/次（3 視角 + 1 統整）
- **冪等保護**：`STATE_FILE` 記錄 `lastWeek`（格式 `YYYY-WNN`），同週重複執行直接跳過

## 執行流程

1. 讀取 4 個 intelligence 檔案（缺失自動跳過）
2. Gemini Call 1：市場趨勢視角 → 前 3 個內容優先項目
3. Gemini Call 2：社群互動視角 → 前 3 個內容優先項目
4. Gemini Call 3：法規政策視角 → 前 3 個內容優先項目
5. Gemini Call 4：Arthur 統整 → 週策略（核心主題 + 每日建議 + 互動策略 + 風險提醒）
6. 覆寫 `~/.openclaw/workspace/intelligence/WEEKLY-STRATEGY.md`
7. 發送週報摘要至 Discord `GENERAL_WEBHOOK_URL`（含週次編號與前 3 行策略）

## Cron 設定

```
0 12 * * 0  cd ~/arthur-bot && node discord-lobster-master/weekly-strategy.js
```

## 語法驗證

`node --check` 通過，無語法錯誤。
