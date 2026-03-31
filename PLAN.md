# Arthur 海外置產 Discord Bot — 實作計畫

> 詳細規格請見 `任務.txt`。本文件追蹤開發進度與技術決策。

## Phase 1：環境準備 ✅
- [x] 啟用 WSL2 + Ubuntu 24.04
- [x] 安裝 Node.js 20 LTS（WSL2 內）
- [x] 安裝 OpenClaw（WSL2 內）
- [x] 取得 Gemini API Key（AI Studio）
- [x] 建立 Telegram Bot（@BotFather）
- [x] 建立 WSL2 工作目錄結構

## Phase 2：Discord 設定 ✅
- [x] 建立伺服器「海外置產情報站」
- [x] 建立所有頻道與分類（7 個分類、16 個頻道）
- [x] 建立 Discord Bot（Bot Token 已設定）
- [x] 建立 9 個頻道 Webhook（自動建立並寫入 .env）

## Phase 3：腳本開發 ✅

### 基礎腳本（discord-lobster-master/ 內修改）
- [x] welcome.js — Arthur 房產顧問人格 + prompt 防禦
- [x] vibes.js — Arthur 人格 + RESEARCH-NOTES.md 動態注入
- [x] memory.js — 擴充欄位（threadDepth、targetMarket、lastSeen）

### 新增腳本（discord-lobster-master/ 內新增）
- [x] news.js — 每日匯率（JPY/THB/AED）+ Google News RSS
- [x] publisher.js — /SPAWN + Quality Gate（Gemini 自評 1-10）
- [x] arthur-agent.js — 深度問答 + threadDepth 防垃圾（max 2/串，max 5/次）
- [x] research-chain.js — RSS → Jina Reader → Gemini → RESEARCH-NOTES.md
- [x] self-heal.js — 3 層自癒（偵測/AI診斷/Telegram告警）
- [x] tg-commander.js — Telegram 長輪詢，8 個遠端指令
- [x] weekly-strategy.js — 三視角週策略 → WEEKLY-STRATEGY.md + 週報
- [x] memory-consolidate.js — 週記憶整合 → WISDOM.md

### Intelligence Files 初始化
- [x] 建立 POST-PERFORMANCE.md（install-openclaw.sh 初始化）
- [x] 建立 COMPETITOR-INTEL.md
- [x] 建立 RESEARCH-NOTES.md
- [x] 建立 WISDOM.md
- [x] 建立 WEEKLY-STRATEGY.md

## Phase 4：Prompt 安全掃描 ✅
> 使用 prompt-defense-audit 對所有 6 個 prompt 執行掃描

- [x] 建立 prompts/ 目錄，匯出所有 prompt 為 .txt
- [x] 掃描所有 prompt — 全部達 A 級（92/100，11/12 向量通過）
- [x] 補強不足的防禦語句（D/F → A）

## Phase 5：crontab 排程設定（systemd 不支援，改用 cron）✅
- [x] 建立 crontab 排程（週期性腳本：welcome/vibes/memory/news/research-chain/self-heal 等）→ setup/setup-crontab.sh
- [x] 設定 WSL2 開機自動啟動 cron（已完成 /etc/wsl.conf）
- [x] 常駐服務啟動腳本（publisher/arthur-agent/tg-commander 以 nohup 背景執行）→ setup/start-persistent.sh

## Phase 6：測試上線 ✅
- [x] 執行自動化功能測試（7 項）— 6 通過 / 1 部分通過（詳見 .dispatch/tasks/phase6-testing/output.md）
- [x] Intelligence Files 初始化（補建 WEEKLY-STRATEGY.md，5 檔全存在）
- [ ] OpenClaw 整合設定（選配）
- [ ] research-chain.js RSS 來源修正（Jina 451 問題）

### 測試結果
| 腳本 | 結果 |
|------|------|
| news.js | ✅ Webhook 204，匯率+新聞正常 |
| research-chain.js | ⚠️ 腳本正常，Jina 451 無法取內文 |
| memory.js | ✅ state 欄位正確 |
| arthur-agent.js | ✅ 空頻道正常退出 |
| self-heal.js | ✅ Layer 1 全通過 |
| tg-commander | ✅ 進程運行，指令處理正常 |
| Intelligence Files | ✅ 5 檔全存在 |

---

## 技術決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| 排程工具 | cron（WSL2） | systemd 在 Windows 10 Home 不支援，cron 零依賴最穩定 |
| 遠端控制 | Telegram Bot | 輕量、免費、手機操作直覺 |
| LLM | Gemini 2.5 Flash（AI Studio） | 免費 1,500 RPD，非 GCP 計費版 |
| 資料儲存 | JSON 檔案 | 零依賴，與 discord-lobster 保持一致 |
| Quality Gate 門檻 | 7/10 | 平衡品質與 RPD 消耗 |

## RPD 日用量規劃

目標：≤ 125 RPD/天（免費額度 8.3%）
詳見 `任務.txt` 的 RPD 預算規劃表。
