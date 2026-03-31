# dev-memory-consolidate — 完成報告

## 建立檔案

`discord-lobster-master/memory-consolidate.js`

## 功能說明

**執行時機：** 每週日 23:00（crontab）

**執行流程：**
1. **Idempotency 防重複**：檢查 state.lastRunAt，若距上次執行 < 6 天則跳過
2. **讀取成員記憶**：`data/member-memory.json`，統計總人數、熱門目標市場、預算樣本
3. **讀取本週活動**（過去 7 天）：
   - `arthur-agent-state.json` → 已回答提問（answered[].question）
   - `publisher-state.json` → 已發文主題（posted[].topic）
   - `news-state.json` → 已發佈新聞標題（publishedItems[].title）
4. **Gemini 合成**（RPD +1）：一次呼叫，萃取四個小節洞察（≤400 字）
5. **Append WISDOM.md**：`## YYYY-MM-DD Weekly Consolidation` 區塊，絕不覆寫歷史
6. **儲存 state**：記錄 lastRunAt + 12 週滾動歷史

**RPD 成本：** 1 RPD/次（週日一次 = 4 RPD/月）

## crontab 設定

```
0 23 * * 0  cd ~/arthur-bot && node discord-lobster-master/memory-consolidate.js
```

## 語法檢查

```
node --check discord-lobster-master/memory-consolidate.js → SYNTAX OK
```

## 架構符合度

- 零 npm 依賴（pure Node.js built-ins）
- 使用 `config`、`loadJson`、`saveJson`、`geminiGenerate` from `lib/`
- `log: _log` 帶 "memory-consolidate" 前綴
- STATE_FILE 在 `config.DATA_DIR`
- history 陣列限 12 筆（`slice(-12)`）防無限增長
- `process.exit(0)` 非致命跳過；`process.exit(1)` 致命錯誤
