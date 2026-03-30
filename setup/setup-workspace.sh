#!/usr/bin/env bash
# setup-workspace.sh — 建立 Arthur Bot WSL2 工作目錄結構
# 執行方式：bash setup/setup-workspace.sh

set -e

DIRS=(
  "$HOME/arthur-bot/discord-lobster-master/data"
  "$HOME/arthur-bot/discord-lobster-master/drafts"
  "$HOME/arthur-bot/discord-lobster-master/logs"
  "$HOME/arthur-bot/discord-lobster-master/prompts"
  "$HOME/.openclaw/workspace/intelligence"
)

for dir in "${DIRS[@]}"; do
  mkdir -p "$dir"
  echo "📁 建立：$dir"
done

echo "✅ 目錄結構建立完成"
