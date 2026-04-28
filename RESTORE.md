# Arthur Bot 復原步驟

> 暫停日期：2026-04-28
> 暫停範圍：crontab 排程 + 3 個常駐服務（publisher / arthur-agent / tg-commander）
> Gemini API：完全停止呼叫（所有 caller 都已關閉）

---

## 暫停時的狀態快照

**已清空的 crontab 任務（11 條）：**

| 排程 | 腳本 | 用途 |
|------|------|------|
| `*/3 * * * *` | welcome.js | 歡迎新成員 |
| `*/10 * * * *` | memory.js | 更新成員記憶 |
| `3,13,23,33,43,53 * * * *` | self-heal.js | 健康自檢 |
| `6,26,46 * * * *` | vibes.js | 插話活躍頻道 |
| `0 5,17 * * *` | research-chain.js | RSS 研究鏈 |
| `0 10 * * *` | news.js rates | 匯率播報 |
| `30 10 * * *` | news.js policy | 房市新聞 |
| `0 12 * * 0` | weekly-strategy.js | 週日策略會議 |
| `0 23 * * 0` | memory-consolidate.js | WISDOM.md 整合 |
| `5 0 * * *` | (truncate) | log 輪替 |
| `@reboot` ×3 | publisher / arthur-agent / tg-commander | 常駐服務 |

**已關閉的常駐 process：**

- `publisher.js`（PID 4531，2026-04-03 啟動）
- `arthur-agent.js`（PID 4545，2026-04-03 啟動）
- `tg-commander.js`（PID 4557，2026-04-03 啟動）

**備份檔：**

- WSL：`/home/training/arthur-bot/crontab.backup`
- Repo：`discord-lobster-master/crontab.backup`（已 commit）

---

## 復原步驟

### 1. 確認 WSL cron 服務有跑

```bash
wsl -e bash -c "service cron status || sudo service cron start"
```

> WSL2 不支援 systemd，每次重啟需用 `service cron start`。`/etc/wsl.conf` 已設定 `[boot] command = service cron start` 可開機自動啟動。

### 2. 還原 crontab

```bash
# 從 repo 還原（推薦，內容版控）
wsl -e bash -c "crontab /home/training/arthur-bot/discord-lobster-master/crontab.backup"

# 或從 WSL 備份還原
wsl -e bash -c "crontab /home/training/arthur-bot/crontab.backup"

# 確認
wsl -e bash -c "crontab -l | head -20"
```

### 3. 啟動 3 個常駐服務

crontab 內已設定 `@reboot`，**WSL 重啟後會自動拉起**。若不想重啟 WSL，可手動啟動：

```bash
wsl -e bash -c "cd /home/training/arthur-bot/discord-lobster-master && \
  setsid /home/training/.nvm/versions/node/v20.20.2/bin/node publisher.js \
    >> /home/training/arthur-bot/logs/publisher.log 2>&1 & \
  setsid /home/training/.nvm/versions/node/v20.20.2/bin/node tg-commander.js \
    >> /home/training/arthur-bot/logs/tg-commander.log 2>&1 & \
  sleep 4 && \
  setsid /home/training/.nvm/versions/node/v20.20.2/bin/node arthur-agent.js \
    >> /home/training/arthur-bot/logs/arthur-agent.log 2>&1 &"
```

> 注意：`tg-commander` 與 `publisher` 先起，`arthur-agent` 延後 4 秒（與 `@reboot` sleep 10 vs sleep 14 的順序一致）。

### 4. 驗證

```bash
# crontab 條目數應為 11 條任務 + 環境變數
wsl -e bash -c "crontab -l | grep -cE '^\*|^[0-9]|^@'"

# 常駐 process 應有 3 個
wsl -e bash -c "ps -ef | grep -E 'publisher|arthur-agent|tg-commander' | grep -v grep"

# 觀察最新 log（10 分鐘內應有 self-heal 心跳）
wsl -e bash -c "tail -5 /home/training/arthur-bot/logs/self-heal.log"
```

### 5. 健全性檢查

- [ ] Discord `#bot-logs` 頻道有看到 self-heal 健康訊息
- [ ] `publisher.js` log 出現 `Listening for /SPAWN`（或同義訊息）
- [ ] `arthur-agent.js` log 出現訊息監聽成功
- [ ] Telegram bot 能回應 `/status`（tg-commander 復活確認）
- [ ] 等到下個 hh:00 / hh:10 / hh:20 看 cron 確實有觸發（檢查對應 log 時間戳）

---

## 緊急再次暫停

```bash
# 一行清空 crontab + 殺常駐
wsl -e bash -c "crontab -r; pkill -f 'publisher.js|arthur-agent.js|tg-commander.js'"
```

---

## 備註

- `seen-url.json`、`member-memory.json`、`*-state.json` 等狀態檔**沒有清空**，復原後會接續處理。
- 若希望跳過暫停期間累積的任務（例如不想補發遺漏的 news / research-chain），復原前手動 `touch` 對應 state 檔即可。
- 若 Gemini API key 在暫停期間額度有變動或被輪替，復原前確認 `.env` 的 `GEMINI_API_KEY` 仍有效。
