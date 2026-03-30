#!/bin/bash
set -e

echo "=== OpenClaw 安裝腳本 ==="

# 安裝 OpenClaw（使用官方 install.sh）
echo "→ 執行 OpenClaw 官方安裝腳本..."
curl -sSL https://openclaw.ai/install.sh | bash

# 建立 workspace 目錄結構
echo ""
echo "→ 建立 ~/.openclaw/workspace/ 目錄結構..."
mkdir -p ~/.openclaw/workspace/intelligence

# 建立 intelligence 檔案（若不存在）
for f in POST-PERFORMANCE.md COMPETITOR-INTEL.md RESEARCH-NOTES.md WISDOM.md; do
    if [ ! -f ~/.openclaw/workspace/intelligence/"$f" ]; then
        touch ~/.openclaw/workspace/intelligence/"$f"
        echo "  ✓ 建立 ~/.openclaw/workspace/intelligence/$f"
    else
        echo "  - ~/.openclaw/workspace/intelligence/$f 已存在，跳過"
    fi
done

echo ""
echo "✓ OpenClaw 安裝完成！"
echo ""
echo "下一步："
echo "  1. 確認 ~/.openclaw/ 目錄已建立完成"
echo "  2. 將專案的 .env 環境變數填寫完整（參見 get-gemini-key-guide.md 和 create-telegram-bot-guide.md）"
echo "  3. 執行 node welcome.js 測試基礎 Discord 連線"
