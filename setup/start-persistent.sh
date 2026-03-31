#!/bin/bash
# Phase 5: 啟動 Arthur Bot 常駐服務（nohup 背景執行）
# 服務：publisher.js / arthur-agent.js / tg-commander.js
# 用法：bash setup/start-persistent.sh [start|stop|restart|status]

set -e

BOT_DIR="$HOME/arthur-bot/discord-lobster-master"
LOG_DIR="$HOME/arthur-bot/logs"
PID_DIR="$HOME/arthur-bot/pids"
NODE_BIN=$(which node 2>/dev/null || echo "")

if [ -z "$NODE_BIN" ]; then
  # 嘗試 nvm 路徑
  NODE_BIN="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin/node"
fi

SERVICES=("publisher" "arthur-agent" "tg-commander")

mkdir -p "$LOG_DIR" "$PID_DIR"

# ─── 函數：啟動單一服務 ───
start_service() {
  local name=$1
  local pid_file="$PID_DIR/${name}.pid"

  # 檢查是否已在執行
  if [ -f "$pid_file" ]; then
    local old_pid=$(cat "$pid_file")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "⚠️  $name 已在執行中（PID: $old_pid），略過"
      return
    else
      rm -f "$pid_file"
    fi
  fi

  echo "🚀 啟動 $name.js ..."
  nohup "$NODE_BIN" "$BOT_DIR/${name}.js" \
    >> "$LOG_DIR/${name}.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$pid_file"
  sleep 1

  if kill -0 "$pid" 2>/dev/null; then
    echo "   ✅ $name 已啟動（PID: $pid）"
  else
    echo "   ❌ $name 啟動失敗，查看 log: $LOG_DIR/${name}.log"
    rm -f "$pid_file"
  fi
}

# ─── 函數：停止單一服務 ───
stop_service() {
  local name=$1
  local pid_file="$PID_DIR/${name}.pid"

  if [ ! -f "$pid_file" ]; then
    echo "   $name 沒有 PID 檔案，可能未啟動"
    return
  fi

  local pid=$(cat "$pid_file")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    rm -f "$pid_file"
    echo "   🛑 $name 已停止（PID: $pid）"
  else
    echo "   $name 已不在執行（PID: $pid 已失效）"
    rm -f "$pid_file"
  fi
}

# ─── 函數：查看狀態 ───
status_service() {
  local name=$1
  local pid_file="$PID_DIR/${name}.pid"

  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo "   ✅ $name  執行中（PID: $pid）"
    else
      echo "   ❌ $name  PID $pid 已不存在（異常終止）"
    fi
  else
    echo "   ⭕ $name  未啟動"
  fi
}

# ─── 主命令處理 ───
ACTION="${1:-start}"

case "$ACTION" in
  start)
    echo "═══════════════════════════════════"
    echo "  Arthur Bot — 啟動常駐服務"
    echo "═══════════════════════════════════"
    for svc in "${SERVICES[@]}"; do
      start_service "$svc"
    done
    echo ""
    echo "📋 狀態確認："
    for svc in "${SERVICES[@]}"; do
      status_service "$svc"
    done
    ;;

  stop)
    echo "═══════════════════════════════════"
    echo "  Arthur Bot — 停止常駐服務"
    echo "═══════════════════════════════════"
    for svc in "${SERVICES[@]}"; do
      stop_service "$svc"
    done
    ;;

  restart)
    echo "═══════════════════════════════════"
    echo "  Arthur Bot — 重啟常駐服務"
    echo "═══════════════════════════════════"
    for svc in "${SERVICES[@]}"; do
      stop_service "$svc"
    done
    sleep 2
    for svc in "${SERVICES[@]}"; do
      start_service "$svc"
    done
    ;;

  status)
    echo "═══════════════════════════════════"
    echo "  Arthur Bot — 常駐服務狀態"
    echo "═══════════════════════════════════"
    for svc in "${SERVICES[@]}"; do
      status_service "$svc"
    done
    ;;

  *)
    echo "用法：$0 [start|stop|restart|status]"
    exit 1
    ;;
esac

echo ""
echo "📁 Log 目錄：$LOG_DIR"
echo "📁 PID 目錄：$PID_DIR"
