#!/bin/bash
# Phase 5: 設定 Arthur Bot crontab 排程
# 執行環境：WSL2 Ubuntu（cron 已由 /etc/wsl.conf 自動啟動）
# 用法：bash setup/setup-crontab.sh

set -e

# WSL2 內的專案路徑
BOT_DIR="$HOME/arthur-bot/discord-lobster-master"
LOG_DIR="$HOME/arthur-bot/logs"
NODE_BIN="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin/node"

# 確認 Node.js 存在
if [ ! -f "$NODE_BIN" ]; then
  # 嘗試直接用 which node
  NODE_BIN=$(which node 2>/dev/null || echo "")
  if [ -z "$NODE_BIN" ]; then
    echo "❌ 找不到 Node.js，請先執行 setup/install-node.sh"
    exit 1
  fi
fi

echo "✅ Node.js: $NODE_BIN"
echo "📁 Bot 目錄: $BOT_DIR"

# 建立 log 目錄
mkdir -p "$LOG_DIR"

# 產生 crontab 內容
CRONTAB_CONTENT="# Arthur Bot 排程 — 自動產生於 $(date '+%Y-%m-%d %H:%M')
# 環境變數
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin

# ─────────────────────────────────────────────
# 高頻週期腳本
# ─────────────────────────────────────────────

# welcome.js — 每 3 分鐘偵測新成員並歡迎
*/3 * * * * cd $BOT_DIR && $NODE_BIN welcome.js >> $LOG_DIR/welcome.log 2>&1

# vibes.js — 每 20 分鐘插話活躍頻道
*/20 * * * * cd $BOT_DIR && $NODE_BIN vibes.js >> $LOG_DIR/vibes.log 2>&1

# memory.js — 每 10 分鐘更新成員記憶
*/10 * * * * cd $BOT_DIR && $NODE_BIN memory.js >> $LOG_DIR/memory.log 2>&1

# self-heal.js — 每 10 分鐘健康自檢
*/10 * * * * cd $BOT_DIR && $NODE_BIN self-heal.js >> $LOG_DIR/self-heal.log 2>&1

# ─────────────────────────────────────────────
# 每日定時腳本
# ─────────────────────────────────────────────

# research-chain.js Round 1 — 每天 05:00
0 5 * * * cd $BOT_DIR && $NODE_BIN research-chain.js >> $LOG_DIR/research-chain.log 2>&1

# news.js — 每天 09:00（匯率 + 政策新聞）
0 9 * * * cd $BOT_DIR && $NODE_BIN news.js >> $LOG_DIR/news.log 2>&1

# research-chain.js Round 2 — 每天 17:00
0 17 * * * cd $BOT_DIR && $NODE_BIN research-chain.js >> $LOG_DIR/research-chain.log 2>&1

# ─────────────────────────────────────────────
# 每週腳本（週日）
# ─────────────────────────────────────────────

# weekly-strategy.js — 每週日 12:00
0 12 * * 0 cd $BOT_DIR && $NODE_BIN weekly-strategy.js >> $LOG_DIR/weekly-strategy.log 2>&1

# memory-consolidate.js — 每週日 23:00
0 23 * * 0 cd $BOT_DIR && $NODE_BIN memory-consolidate.js >> $LOG_DIR/memory-consolidate.log 2>&1

# ─────────────────────────────────────────────
# Log 輪替（每天 00:05 清空超過 7 天的舊 log）
# ─────────────────────────────────────────────
5 0 * * * find $LOG_DIR -name '*.log' -mtime +7 -exec truncate -s 0 {} \;
"

# 備份現有 crontab
crontab -l > /tmp/crontab-backup-$(date +%Y%m%d).txt 2>/dev/null || true
echo "📋 舊 crontab 已備份至 /tmp/crontab-backup-$(date +%Y%m%d).txt"

# 移除舊的 Arthur 排程（若存在）
EXISTING=$(crontab -l 2>/dev/null | grep -v "# Arthur Bot" | grep -v "arthur-bot" | grep -v "welcome.js" | grep -v "vibes.js" | grep -v "memory.js" | grep -v "self-heal.js" | grep -v "research-chain.js" | grep -v "news.js" | grep -v "weekly-strategy.js" | grep -v "memory-consolidate.js" || true)

# 合併寫入
{ echo "$EXISTING"; echo ""; echo "$CRONTAB_CONTENT"; } | crontab -

echo ""
echo "✅ Crontab 已安裝！目前排程："
echo "──────────────────────────────────"
crontab -l
echo "──────────────────────────────────"
echo ""
echo "📌 提示：常駐服務（publisher/arthur-agent/tg-commander）"
echo "   請另外執行 bash setup/start-persistent.sh"
