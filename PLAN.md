# Arthur 海外置產 Discord Bot — 實作計畫

> 詳細規格請見 `任務.txt`。本文件追蹤開發進度與技術決策。

## Phase 1：環境準備
- [ ] 啟用 WSL2 + Ubuntu 24.04
- [ ] 安裝 Node.js 20 LTS（WSL2 內）
- [ ] 安裝 OpenClaw（WSL2 內）
- [ ] 取得 Gemini API Key（AI Studio，非 GCP 計費專案）
- [ ] 建立 Telegram Bot（@BotFather）
- [ ] 建立 WSL2 工作目錄結構

## Phase 2：Discord 設定
- [ ] 建立伺服器「海外置產情報站」
- [ ] 建立所有頻道與分類（依 P-1 規格）
- [ ] 建立 Discord Bot（開啟 3 個 Intent）
- [ ] 建立 12 個頻道 Webhook

## Phase 3：腳本開發
> 標記 [TDD] 的項目需使用 test-driven-development skill 執行

### 基礎腳本（discord-lobster-master/ 內修改）
- [ ] welcome.js — 修改 prompt 為 Arthur 房產人格
- [ ] vibes.js — 修改 prompt，加入 RESEARCH-NOTES.md 讀取
- [ ] memory.js — 擴充欄位（threadDepth、targetMarket 等）

### 新增腳本（discord-lobster-master/ 內新增）
- [ ] news.js — 每日匯率 + 政策新聞 [TDD: 測試 Webhook 送出格式]
- [ ] publisher.js — /SPAWN + Quality Gate [TDD: 測試 Quality Gate 評分邏輯]
- [ ] arthur-agent.js — 深度問答 + 串接深度限制 [TDD: 測試 threadDepth 計數]
- [ ] research-chain.js — RSS → Jina → Gemini [TDD: 測試 seen-url.json 去重]
- [ ] self-heal.js — 3 層自癒哨兵
- [ ] tg-commander.js — Telegram 遠端控制（8 個指令）
- [ ] weekly-strategy.js — 週策略 + 週報
- [ ] memory-consolidate.js — 週記憶整合 → WISDOM.md

### Intelligence Files 初始化
- [ ] 建立 POST-PERFORMANCE.md（初始空白）
- [ ] 建立 COMPETITOR-INTEL.md（填入已知競爭對手）
- [ ] 建立 RESEARCH-NOTES.md
- [ ] 建立 WISDOM.md
- [ ] 建立 WEEKLY-STRATEGY.md

## Phase 4：Prompt 安全掃描
> [TDD] 使用 prompt-defense-audit 對所有 6 個 prompt 執行掃描

- [ ] 建立 prompts/ 目錄，匯出所有 prompt 為 .txt
- [ ] 掃描所有 prompt，目標 B 級（70分）以上
- [ ] 補強不足的防禦語句

## Phase 5：WSL2 排程設定
- [ ] 建立 15 個 systemd timer 檔案
- [ ] 建立 3 個常駐 systemd service 檔案
- [ ] 啟用所有計時器
- [ ] 設定 WSL2 開機自動啟動

## Phase 6：測試上線
- [ ] 執行功能測試清單（13 個測試項）
- [ ] Intelligence Files 初始化
- [ ] OpenClaw 整合設定
- [ ] 建立上線後追蹤指標儀表板

---

## 技術決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| 排程工具 | systemd timers（WSL2） | 比 PM2 cron 更穩定，支援 Linux 生態 |
| 遠端控制 | Telegram Bot | 輕量、免費、手機操作直覺 |
| LLM | Gemini 2.5 Flash（AI Studio） | 免費 1,500 RPD，非 GCP 計費版 |
| 資料儲存 | JSON 檔案 | 零依賴，與 discord-lobster 保持一致 |
| Quality Gate 門檻 | 7/10 | 平衡品質與 RPD 消耗 |

## RPD 日用量規劃

目標：≤ 125 RPD/天（免費額度 8.3%）
詳見 `任務.txt` 的 RPD 預算規劃表。
