# 建立 Telegram Bot 步驟說明

本指南說明如何透過 @BotFather 建立 Arthur 的 Telegram 遠端控制機器人，並取得必要的 Token 與 Chat ID。

---

## 第一步：透過 @BotFather 建立 Bot

1. 開啟 Telegram，在搜尋欄輸入 **@BotFather**
2. 點選官方帳號（藍色認證勾勾），按下 **Start（開始）**
3. 輸入指令：
   ```
   /newbot
   ```
4. BotFather 會詢問 Bot 的**顯示名稱**，輸入：
   ```
   Arthur 海外房產助理
   ```
5. BotFather 接著詢問 **username（使用者名稱）**，必須以 `bot` 結尾，例如：
   ```
   ArthurRealEstateBot
   ```
   > 注意：username 全球唯一，若已被使用請換一個名稱

6. 建立成功後，BotFather 會回覆包含 **HTTP API Token** 的訊息，格式如下：
   ```
   1234567890:ABCdefGhIJKlmNoPQRsTUVwxYZ1234567890
   ```
   **請立即複製並妥善保存此 Token，不要分享給任何人。**

---

## 第二步：將 Token 填入 .env

開啟專案根目錄的 `.env` 檔案，找到或新增以下這行：

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxYZ1234567890
```

將等號後方替換為你剛才取得的實際 Token。

---

## 第三步：取得自己的 Telegram Chat ID

Chat ID 用於讓 Bot 只回應你的指令（避免外人控制 Arthur）。

1. 在 Telegram 搜尋 **@userinfobot**
2. 按下 **Start（開始）**，Bot 會立即回覆你的帳號資訊，例如：
   ```
   Id: 987654321
   First: Arthur
   Last: (空白)
   Username: @yourusername
   ```
3. 複製 **Id** 後面的數字（即 `987654321`）

---

## 第四步：將 Chat ID 填入 .env

```env
TELEGRAM_CHAT_ID=987654321
```

---

## 完成確認清單

- [ ] @BotFather 已建立 Bot，取得 Token
- [ ] `.env` 已填入 `TELEGRAM_BOT_TOKEN`
- [ ] @userinfobot 已取得自己的 Chat ID
- [ ] `.env` 已填入 `TELEGRAM_CHAT_ID`

---

## 安全提醒

- Token 等同 Bot 的完整控制權，請勿上傳至 Git（`.env` 已在 `.gitignore` 中）
- 若 Token 外洩，立即到 @BotFather 執行 `/revoke` 重新產生
- 若要停用 Bot，對 @BotFather 執行 `/mybots` → 選擇 Bot → **Delete bot**
