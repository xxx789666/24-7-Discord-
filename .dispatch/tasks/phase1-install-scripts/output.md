# Phase 1 產出摘要 — WSL2 安裝腳本

完成日期：2026-03-30

## 產出檔案

| 檔案 | 說明 |
|------|------|
| `setup/install-node.sh` | nvm 存在檢查 → 自動安裝 nvm v0.39.7（若無）→ 安裝 Node.js 20 LTS → `node --version` 驗證 |
| `setup/install-openclaw.sh` | 執行官方 install.sh → 建立 `~/.openclaw/workspace/intelligence/` → 初始化 4 個 intelligence .md 檔 |
| `setup/create-telegram-bot-guide.md` | 繁體中文：@BotFather /newbot 流程 → 取得 Token → @userinfobot 取得 Chat ID → 填入 .env |
| `setup/get-gemini-key-guide.md` | 繁體中文：強調只用 AI Studio（含 $127 真實教訓）→ 建立免費 Key → RPD 預算表 → 填入 .env |

## 注意事項

- 所有 `.sh` 腳本均包含 `#!/bin/bash` 與 `set -e`
- `install-node.sh` 使用 nvm v0.39.7（截至 2026-03 的最新穩定版）
- `install-openclaw.sh` 會自動建立 intelligence 目錄及 4 個空白 .md 檔（POST-PERFORMANCE / COMPETITOR-INTEL / RESEARCH-NOTES / WISDOM）
- 兩份指南均含完成確認清單，方便使用者自我核對

## 下一步（Phase 2）

參考 `任務.txt` 繼續建立 Discord 頻道結構與 systemd timer 設定。
