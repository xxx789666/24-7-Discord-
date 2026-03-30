# 取得 Gemini API Key 步驟說明

## ⚠️ 重要警告：絕對不能從 GCP Console 建立

> **真實教訓：** 曾有人從 Google Cloud Platform（GCP）計費專案建立 Gemini API Key，
> 因為 GCP 專案的 **thinking token 沒有速率上限**，7 天內花掉了 **$127.80 美金**。
>
> **務必只從 AI Studio 建立 API Key，那裡提供真正免費的 1,500 RPD 額度。**

---

## 正確做法：從 AI Studio 取得 API Key

### 第一步：開啟 AI Studio

在瀏覽器中前往：

```
https://aistudio.google.com/apikeys
```

> 直接點這個網址，不要透過 Google Cloud Console 進入

### 第二步：登入 Google 帳號

使用你的 Google 帳號登入（建議使用個人帳號，非企業/組織帳號）。

### 第三步：建立 API Key

1. 點選右上角的 **「建立 API 金鑰」** 或 **「Create API key」** 按鈕
2. 選擇 **「在新專案中建立 API 金鑰」**（Create API key in new project）
   > ⚠️ 不要選擇「在現有專案中建立」，避免誤用已啟用計費的 GCP 專案
3. 系統會產生一組 API Key，格式如下：
   ```
   AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
4. **複製此 Key 並立即存入安全處**

### 第四步：確認免費額度

建立完成後，確認頁面顯示的是免費方案：
- **Gemini 1.5 Flash / 2.0 Flash**：每日 1,500 RPD（requests per day）
- **無需信用卡**，不會自動扣費

---

## 填入 .env 設定

開啟專案根目錄的 `.env` 檔案，找到或新增：

```env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

將等號後方替換為你實際取得的 Key。

---

## RPD 預算說明

本專案每日預計使用約 **125 RPD**，僅佔免費額度的 **8.3%**：

| 腳本 | 每日用量 |
|------|---------|
| welcome.js（歡迎新成員） | ~15 RPD |
| vibes.js（頻道插話） | ~20 RPD |
| memory.js（記憶萃取） | ~18 RPD |
| news.js（匯率+政策新聞） | ~8 RPD |
| publisher.js（/SPAWN 發文） | ~10 RPD |
| arthur-agent.js（深度問答） | ~30 RPD |
| research-chain.js（每日 2 次） | ~8 RPD |
| weekly-strategy.js（週日） | ~5 RPD |
| 其他（Quality Gate、健康報告） | ~11 RPD |
| **合計** | **~125 RPD** |

剩餘 ~1,375 RPD 可供成員互動使用。

---

## 安全提醒

- API Key 請勿上傳至 Git（`.env` 已加入 `.gitignore`）
- 若 Key 外洩，立即到 AI Studio 刪除並重新建立
- 定期在 AI Studio 確認用量，確保未超出免費額度

---

## 完成確認清單

- [ ] 已從 `https://aistudio.google.com/apikeys` 取得 API Key
- [ ] 確認是 AI Studio 免費方案（非 GCP 計費專案）
- [ ] `.env` 已填入 `GEMINI_API_KEY`
- [ ] 確認 `.env` 已在 `.gitignore` 中
