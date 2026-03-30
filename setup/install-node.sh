#!/bin/bash
set -e

echo "=== Node.js 20 LTS 安裝腳本 (透過 nvm) ==="

# 檢查 nvm 是否已安裝
if command -v nvm &>/dev/null || [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "✓ nvm 已安裝，載入中..."
    # 確保 nvm 已載入（.bashrc 可能尚未 source）
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
else
    echo "→ nvm 未安裝，開始安裝 nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

    # 載入剛安裝的 nvm
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    echo "✓ nvm 安裝完成"
fi

# 安裝 Node.js 20 LTS
echo "→ 安裝 Node.js 20 LTS..."
nvm install 20
nvm use 20
nvm alias default 20

# 驗證安裝
echo ""
echo "=== 安裝驗證 ==="
node --version
npm --version

echo ""
echo "✓ Node.js 20 LTS 安裝完成！"
echo "  提示：如果在新 shell 中找不到 node，請執行："
echo "  source ~/.bashrc  (bash) 或  source ~/.zshrc  (zsh)"
