# publisher.js — 完成報告

## 建立的檔案

### `discord-lobster-master/publisher.js`
持久常駐服務（每 30 秒輪詢），處理 `/SPAWN` 指令。

**指令格式：**
```
/SPAWN [market] [content body]
market: japan | thai | dubai | others
```

**Quality Gate 流程：**
1. 讀取 `~/.openclaw/workspace/intelligence/POST-PERFORMANCE.md` 與 `COMPETITOR-INTEL.md`（路徑不存在自動略過）
2. Gemini 生成含標題、條列重點、行動呼籲的格式化貼文
3. Gemini 自評 1–10（按標題吸引力、實用性、結構、行動呼籲、語氣）
4. 分數 < 7：重新生成，最多 2 次重試
5. 仍 < 7：儲存至 `discord-lobster-master/drafts/[timestamp]-[market].md`，跳過發文
6. 分數 >= 7：`postWebhook()` 到對應市場頻道

**Webhook 對應：**
| market | webhook env var |
|--------|----------------|
| japan  | JAPAN_WEBHOOK_URL |
| thai   | THAI_WEBHOOK_URL |
| dubai  | DUBAI_WEBHOOK_URL |
| others | OTHERS_WEBHOOK_URL |

### `discord-lobster-master/lib/config.js`（修改）
新增匯出：
- `SPAWN_CHANNEL_ID`（optional，讀自 env）
- `JAPAN_WEBHOOK_URL`
- `THAI_WEBHOOK_URL`
- `DUBAI_WEBHOOK_URL`
- `OTHERS_WEBHOOK_URL`

## .env 需新增

```env
SPAWN_CHANNEL_ID=your_spawn_channel_id
JAPAN_WEBHOOK_URL=https://discord.com/api/webhooks/...
THAI_WEBHOOK_URL=https://discord.com/api/webhooks/...
DUBAI_WEBHOOK_URL=https://discord.com/api/webhooks/...
OTHERS_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## 啟動方式

```bash
# 背景常駐
nohup node discord-lobster-master/publisher.js > logs/publisher.log 2>&1 &
```

## 語法驗證
`node --check` 通過，零錯誤。
