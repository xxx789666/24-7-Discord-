# Arthur Bot — 24/7 AI Discord 社群自動化管理系統

> **An autonomous, AI-powered Discord community manager for overseas real estate investment communities.**  
> 零 npm 依賴 · 免費 Gemini API · $0/月運行成本 · WSL2 Ubuntu 部署

---

## 目錄 / Table of Contents

- [系統概覽 / Overview](#系統概覽--overview)
- [執行環境 / Environment](#執行環境--environment)
- [系統架構 / Architecture](#系統架構--architecture)
- [腳本說明 / Scripts](#腳本說明--scripts)
- [排程任務 / Scheduled Tasks](#排程任務--scheduled-tasks)
- [常駐服務 / Persistent Services](#常駐服務--persistent-services)
- [資料流程 / Data Flow](#資料流程--data-flow)
- [自癒系統 / Self-Heal System](#自癒系統--self-heal-system)
- [遠端控制 / Remote Control](#遠端控制--remote-control)
- [頻道結構 / Channel Structure](#頻道結構--channel-structure)
- [操作說明 / Usage Guide](#操作說明--usage-guide)
- [可實現應用場景 / Use Cases](#可實現應用場景--use-cases)

---

## 系統概覽 / Overview

**Arthur Bot** 是一套完全自動化的 Discord 社群管理 AI，專為海外置產社群打造。系統以 **Google Gemini Flash** 作為語言模型，透過 Discord Webhook 與 Bot API 實現全天候自動互動、內容發布、成員管理與系統自癒。

**Arthur Bot** is a fully autonomous Discord community AI built for overseas real estate investment communities. Powered by **Google Gemini Flash**, it delivers 24/7 automated engagement, content publishing, member profiling, and self-healing system management.

### 核心特性 / Key Features

| 特性 | 說明 |
|------|------|
| 🤖 **零人力值班** | 24/7 自動回覆、歡迎、發文，無需人工干預 |
| 💰 **零成本運行** | 使用 Gemini 免費 API，純 Node.js 內建模組，無付費依賴 |
| 🔧 **三層自癒機制** | 自動偵測問題 → Gemini 診斷 → Telegram 告警 |
| 📊 **成員記憶系統** | 自動建立每位成員的興趣與背景檔案 |
| 📡 **多平台遠端控制** | Telegram Bot + Discord #admin 頻道雙管道指令介面 |
| 🛡️ **Prompt 安全防護** | 防止角色竄改、資料洩漏、多語言繞過等 12 種攻擊向量 |

---

## 執行環境 / Environment

```
作業系統: Windows 10 + WSL2 Ubuntu (Linux 子系統)
執行環境: Node.js 20 LTS (via nvm)
排程系統: cron (WSL2 原生，非 systemd)
外部依賴: 零 npm 套件 (純 Node.js built-ins: https, fs, path, crypto)
AI 模型:  Google Gemini 2.5 Flash (免費 API)
```

```
OS: Windows 10 + WSL2 Ubuntu
Runtime: Node.js 20 LTS (via nvm)
Scheduler: cron (native WSL2, not systemd)
Dependencies: Zero npm packages (Node.js built-ins only)
AI Model: Google Gemini 2.5 Flash (free API tier)
```

### 目錄結構 / Directory Layout

```
$HOME/arthur-bot/
├── discord-lobster-master/   # 主程式 / Bot source
│   ├── lib/
│   │   ├── config.js         # 環境變數載入器
│   │   └── utils.js          # Discord API、Gemini、Webhook 工具
│   ├── data/                 # 執行期狀態 JSON (gitignored)
│   └── logs/                 # 各腳本獨立 log 檔
├── logs/                     # 常駐服務 log
└── pids/                     # PID 追蹤檔
```

---

## 系統架構 / Architecture

```mermaid
graph TB
    subgraph CRON["⏰ 排程腳本 Cron Scripts"]
        W[welcome.js<br/>每 3 分鐘]
        V[vibes.js<br/>每 20 分鐘]
        M[memory.js<br/>每 10 分鐘]
        SH[self-heal.js<br/>每 10 分鐘]
        RC[research-chain.js<br/>05:00 & 17:00]
        N[news.js<br/>09:00 每日]
        WS[weekly-strategy.js<br/>週日 12:00]
        MC[memory-consolidate.js<br/>週日 23:00]
    end

    subgraph DAEMON["🔄 常駐服務 Persistent Daemons"]
        P[publisher.js<br/>長期運行]
        AA[arthur-agent.js<br/>長期運行]
        TG[tg-commander.js<br/>長期運行]
    end

    subgraph INFRA["🏗️ 共用基礎設施"]
        CFG[lib/config.js<br/>.env 載入]
        UTL[lib/utils.js<br/>API 工具]
        DATA[data/*.json<br/>狀態儲存]
        MEM[member-memory.json<br/>成員記憶]
    end

    subgraph EXTERNAL["🌐 外部服務"]
        DISC[Discord API]
        GEMINI[Google Gemini API]
        TGA[Telegram Bot API]
        RSS[RSS Feeds]
        EXCH[Exchange Rate API]
    end

    CRON --> UTL
    DAEMON --> UTL
    UTL --> DISC
    UTL --> GEMINI
    TG --> TGA
    RC --> RSS
    N --> EXCH
    INFRA --> DATA
    M --> MEM
    AA --> MEM
```

---

## 腳本說明 / Scripts

### 排程腳本 (Cron Scripts)

#### `welcome.js` — 新成員歡迎

```mermaid
flowchart LR
    A[每 3 分鐘觸發] --> B[讀取 welcome-state.json]
    B --> C{有新成員?}
    C -- 否 --> Z[結束]
    C -- 是 --> D[讀取成員資料]
    D --> E[Gemini 生成\n個人化歡迎語]
    E --> F[Discord Webhook\n發送至 #welcome]
    F --> G[更新 state,\n記錄已歡迎 ID]
    G --> Z
```

- 偵測 `#welcome` 頻道的新加入訊息，為每位成員生成**個人化**歡迎詞
- 避免重複歡迎（state 追蹤已處理 ID）

---

#### `vibes.js` — 社群氛圍互動

```mermaid
flowchart LR
    A[每 20 分鐘觸發] --> B{系統暫停?}
    B -- 是 --> Z[結束]
    B -- 否 --> C[讀取 #general\n最新 50 則訊息]
    C --> D[Gemini 分析對話\n判斷是否適合插入]
    D --> E{品質分數 ≥ 7?}
    E -- 否 --> F{重試 < 2 次?}
    F -- 是 --> D
    F -- 否 --> Z
    E -- 是 --> G[Discord Webhook\n發送至 #general]
    G --> Z
```

---

#### `memory.js` — 成員記憶建檔

```mermaid
flowchart LR
    A[每 10 分鐘觸發] --> B[讀取各頻道\n最新訊息]
    B --> C[Gemini 抽取\n成員興趣/背景]
    C --> D[更新 member-memory.json]
    D --> E[各腳本可讀取\n做個人化回覆]
```

---

#### `self-heal.js` — 三層自癒哨兵

見 [自癒系統](#自癒系統--self-heal-system) 章節。

---

#### `research-chain.js` — 研究鏈

```mermaid
flowchart TD
    A[05:00 & 17:00 觸發] --> B[讀取 RSS 來源]
    B --> C[過濾已處理 URL\nseen-url.json]
    C --> D{新文章 ≤ 5 篇}
    D --> E[Jina Reader\n擷取全文]
    E --> F[Gemini 分析\n萃取政策重點]
    F --> G[寫入 RESEARCH-NOTES.md]
    G --> H[更新 seen-url.json]
```

---

#### `news.js` — 每日市場情報

```mermaid
flowchart LR
    A[09:00 觸發] --> B{今日已執行?}
    B -- 是 --> Z[結束]
    B -- 否 --> C[取得日幣/泰銖/\n迪拉姆匯率]
    C --> D[抓取 3 市場 RSS\n日本/泰國/杜拜]
    D --> E1[Gemini 生成\n匯率貼文]
    D --> E2[Gemini 篩選\n政策新聞 2則/市場]
    E1 --> F1[發送至 #匯率]
    E2 --> F2[發送至 #房市新聞]
```

---

### 常駐服務 (Persistent Daemons)

#### `arthur-agent.js` — 深度 Q&A

```mermaid
flowchart TD
    A[30秒輪詢\n#ask-arthur-agent] --> B{新訊息?}
    B -- 否 --> A
    B -- 是 --> C{訊息 ≥ 5 字?}
    C -- 否 --> A
    C -- 是 --> D[👀 表情反應]
    D --> E[🤔 思考中]
    E --> F[💬 準備回覆]
    F --> G[✍️ 撰寫中]
    G --> H[注入 IDENTITY.md\n成員記憶\nWISDOM.md]
    H --> I[Gemini 生成回覆\n300字以內]
    I --> J[移除 ✍️]
    J --> K[Discord 回覆訊息]
    K --> L[更新 thread depth\n≤ 2次/thread]
    L --> A
```

---

#### `publisher.js` — 發布引擎

```mermaid
flowchart TD
    A[監聽 /SPAWN 指令] --> B[解析市場\njapan/thai/dubai/others]
    B --> C[Gemini 生成貼文]
    C --> D[Gemini 自評分\n1-10分]
    D --> E{分數 ≥ 7?}
    E -- 否 --> F{重試 < 2?}
    F -- 是 --> C
    F -- 否 --> G[儲存至 drafts/]
    E -- 是 --> H[發送至對應市場頻道]
    H --> I{附帶 PDF 連結?}
    I -- 是 --> J[另發 PDF 訊息]
    I -- 否 --> K[完成]
    J --> K
```

---

## 排程任務 / Scheduled Tasks

```mermaid
gantt
    title 每日排程時間軸 / Daily Schedule Timeline (UTC+8)
    dateFormat HH:mm
    axisFormat %H:%M

    section 高頻輪詢
    welcome.js (每3分)    :active, 00:00, 24:00
    memory.js (每10分)    :active, 00:00, 24:00
    self-heal.js (每10分) :active, 00:00, 24:00
    vibes.js (每20分)     :active, 00:00, 24:00

    section 定時任務
    Log 清理              :milestone, 00:05, 1m
    research-chain (早)   :milestone, 05:00, 30m
    news.js               :milestone, 09:00, 20m
    research-chain (晚)   :milestone, 17:00, 30m

    section 週日限定
    weekly-strategy.js    :crit, 12:00, 60m
    memory-consolidate.js :crit, 23:00, 30m
```

| 腳本 | 頻率 | 時間 | RPD 消耗 |
|------|------|------|----------|
| `welcome.js` | 每 3 分鐘 | 全天 | ~0-5/天 |
| `vibes.js` | 每 20 分鐘 | 全天 | ~72/天 |
| `memory.js` | 每 10 分鐘 | 全天 | ~144/天 |
| `self-heal.js` | 每 10 分鐘 | 全天 | 僅告警時 |
| `research-chain.js` | 2x/天 | 05:00, 17:00 | ~10/天 |
| `news.js` | 每日 | 09:00 | ~2/天 |
| `weekly-strategy.js` | 週日 | 12:00 | ~5/週 |
| `memory-consolidate.js` | 週日 | 23:00 | ~3/週 |

> **RPD 目標**: 免費 Key ≤ 125/天（免費上限 1,500 RPD 的 8.3%）

---

## 常駐服務 / Persistent Services

### 啟動管理

```bash
# 啟動所有服務
bash ~/arthur-bot/setup/start-persistent.sh start

# 查看狀態
bash ~/arthur-bot/setup/start-persistent.sh status

# 重啟（強制清除孤兒進程）
bash ~/arthur-bot/setup/start-persistent.sh restart

# 停止
bash ~/arthur-bot/setup/start-persistent.sh stop
```

### 進程管理流程

```mermaid
flowchart LR
    A[start 指令] --> B{PID 檔存在?}
    B -- 是 --> C{進程活著?}
    C -- 是 --> D[略過:已在執行]
    C -- 否 --> E[清除舊 PID]
    E --> F[setsid node script.js\n背景啟動]
    B -- 否 --> F
    F --> G[寫入 PID 檔]
    G --> H{1秒後存活?}
    H -- 是 --> I[✅ 啟動成功]
    H -- 否 --> J[❌ 啟動失敗\n查看 log]
```

---

## 資料流程 / Data Flow

```mermaid
flowchart TD
    subgraph INPUT["輸入來源"]
        DM[Discord 訊息]
        RSS2[RSS Feeds]
        EX[匯率 API]
        TG2[Telegram 指令]
        DC[Discord #admin 指令]
    end

    subgraph PROCESS["處理層"]
        G2[Gemini API\n語言理解/生成]
        MF[member-memory.json\n成員記憶]
        SF[*-state.json\n執行狀態]
        ID[IDENTITY.md\nArthur 身分]
        WD[WISDOM.md\n知識累積]
    end

    subgraph OUTPUT["輸出目標"]
        WH[Discord Webhooks\n各頻道貼文]
        RE[Discord 回覆訊息]
        TGO[Telegram 告警]
        BL[#bot-logs 頻道]
        RN[RESEARCH-NOTES.md]
    end

    INPUT --> PROCESS
    PROCESS --> OUTPUT
    MF --> G2
    ID --> G2
    WD --> G2
    G2 --> WH
    G2 --> RE
    G2 --> RN
```

---

## 自癒系統 / Self-Heal System

```mermaid
flowchart TD
    A[每 10 分鐘啟動] --> B

    subgraph L1["Layer 1: 偵測 & 自動修復"]
        B[收集系統指標] --> C1{Gemini 冷卻鎖\n超過 24h?}
        C1 -- 是 --> D1[自動刪除鎖定]
        B --> C2{Webhook 無回應?}
        B --> C3{Heap 超過 500MB?}
        B --> C4{Data 目錄超 100MB?}
        B --> C5{State JSON 損毀?}
        C5 -- 是 --> D5[備份為 .corrupt]
        B --> C6{腳本超過 2x 預期間隔\n未執行?}
        B --> C7{重複常駐進程?}
        C7 -- 是 --> D7[SIGTERM 終止舊進程]
    end

    subgraph L2["Layer 2: Gemini 診斷"]
        E[整理問題清單] --> F[Gemini 生成\n繁體中文診斷建議]
    end

    subgraph L3["Layer 3: Telegram 告警"]
        G[組合告警訊息] --> H[推播至\nTELEGRAM_ADMIN_CHAT_ID]
    end

    D1 & D5 & D7 & C2 & C3 & C4 & C6 --> E
    E --> L2
    L2 --> L3

    I{有錯誤?} -- 否 --> J[✅ 系統健康\n結束]
    B --> I
    I -- 是 --> E
```

### 偵測項目 / Detection Items

| # | 項目 | 自動修復 | 告警 |
|---|------|---------|------|
| 1 | Gemini 冷卻鎖過期（>24h） | ✅ 自動刪除 | ✅ |
| 2 | Webhook HEAD 請求失敗 | ❌ | ✅ |
| 3 | Heap 記憶體 > 500MB | ❌ | ✅ |
| 4 | Data 目錄 > 100MB | ❌ | ✅ |
| 5 | State JSON 損毀 | ✅ 備份 .corrupt | ✅ |
| 6 | 腳本超過 2× 間隔未執行 | ❌ | ✅ |
| 7 | 重複常駐進程 | ✅ SIGTERM 舊進程 | ✅ |

---

## 遠端控制 / Remote Control

### 雙管道控制介面

```mermaid
flowchart LR
    A[管理員] --> B{選擇介面}
    B --> C[Telegram Bot]
    B --> D[Discord #admin 頻道]
    C --> E[tg-commander.js\n長期 polling]
    D --> E
    E --> F[cmdStatus / cmdReport\ncmdHeal / cmdStats\ncmdSpawn / cmdPause/Resume]
    F --> G[執行操作]
    G --> H[回覆管理員]
```

### Telegram 指令

| 指令 | 說明 |
|------|------|
| `/status` | 各腳本最後執行時間 |
| `/stats` | 成員數、互動次數統計 |
| `/report` | 今日 RPD API 用量 |
| `/heal` | 自癒系統最後健康報告 |
| `/spawn <市場> <內容>` | 手動觸發發布任務 |
| `/pause` | 暫停所有腳本 |
| `/resume` | 恢復腳本執行 |
| `/help` | 顯示所有指令 |

### Discord #admin 指令

| 指令 | 說明 |
|------|------|
| `!status` | 各腳本最後執行時間 |
| `!report` | 今日 RPD 用量 |
| `!heal` | 健康檢查報告 |
| `!stats` | 成員與互動統計 |
| `!restart` | 重啟所有常駐服務 |
| `!help` | 顯示說明 |

---

## 頻道結構 / Channel Structure

```
Discord 伺服器
├── 📢 公告類
│   ├── #welcome          ← welcome.js 歡迎新成員
│   └── #announcements
│
├── 💬 社群互動
│   ├── #general          ← vibes.js 參與對話
│   └── #ask-arthur-agent ← arthur-agent.js 深度 Q&A
│
├── 📊 市場情報
│   ├── #匯率             ← news.js 每日匯率
│   ├── #房市新聞          ← news.js 政策新聞
│   ├── #japan            ← publisher.js 日本市場
│   ├── #thailand         ← publisher.js 泰國市場
│   ├── #dubai            ← publisher.js 杜拜市場
│   └── #others           ← publisher.js 其他市場
│
└── 🔧 系統管理
    ├── #bot-logs         ← utils.js 系統 log 轉發
    └── #admin            ← tg-commander.js 管理指令
```

---

## 操作說明 / Usage Guide

### 每日監控

```bash
# 查看各服務狀態
bash ~/arthur-bot/setup/start-persistent.sh status

# 查看 arthur-agent 運作
tail -f ~/arthur-bot/logs/arthur-agent.log

# 查看 self-heal 報告
tail -20 ~/arthur-bot/discord-lobster-master/logs/self-heal.log

# 查看今日 API 用量
cat ~/arthur-bot/discord-lobster-master/data/rpd-counter.json
```

### 手動觸發

```bash
# 手動執行新聞腳本
node ~/arthur-bot/discord-lobster-master/news.js

# 手動執行研究鏈
node ~/arthur-bot/discord-lobster-master/research-chain.js

# 手動健康檢查
node ~/arthur-bot/discord-lobster-master/self-heal.js
```

### 遠端指令（Telegram 或 Discord #admin）

```
/status   — 確認各腳本運作時間
/report   — 確認 API 用量不超標
/heal     — 查看最後健康檢查
/stats    — 看社群互動數據
!restart  — 重啟所有服務（Discord #admin）
```

### 暫停與恢復

```bash
# 緊急暫停所有 AI 回應
touch ~/arthur-bot/discord-lobster-master/data/pause.lock

# 恢復
rm ~/arthur-bot/discord-lobster-master/data/pause.lock
```

---

## 可實現應用場景 / Use Cases

### 已實現場景

| 場景 | 實現腳本 | 說明 |
|------|----------|------|
| 🏠 海外置產社群自動化 | 全套系統 | 本案主要用途 |
| 🌍 多市場（日本/泰國/杜拜）內容分發 | publisher.js | 自動分頻道發布 |
| 📈 每日匯率與房市新聞 | news.js | 三幣種匯率 + 政策篩選 |
| 🤖 24/7 AI 客服問答 | arthur-agent.js | 房地產知識問答 |
| 👋 個人化新成員歡迎 | welcome.js | 依成員背景客製化 |
| 📚 自動研究報告生成 | research-chain.js | RSS → AI 摘要 |
| 🧠 成員興趣建檔 | memory.js | 累積社群知識 |

### 可延伸應用場景

| 場景 | 需調整項目 |
|------|-----------|
| 📦 電商社群管理 | 調整 IDENTITY.md 與 prompt 主題 |
| 💹 股票/加密貨幣社群 | 替換 RSS 來源與匯率 API |
| 🎓 教育/學習社群 | 調整 vibes.js 互動風格 |
| 🏥 醫療/健康社群 | 加強 prompt 安全限制 |
| 🌐 多語言社群 | 修改 prompt 語言設定 |
| 📰 新聞媒體社群 | 擴增 RSS 來源數量 |

---

## 技術規格 / Technical Specs

| 項目 | 規格 |
|------|------|
| **語言** | Node.js (CommonJS) |
| **外部依賴** | 零 npm 套件 |
| **AI 模型** | Gemini 2.5 Flash |
| **API 免費上限** | 1,500 RPD / 天 |
| **目標用量** | ≤ 125 RPD / 天 |
| **Thread 上限** | 每 thread 最多 2 回覆 |
| **State 保留** | 滾動 300 筆 |
| **Self-heal 指標** | 滾動 144 筆（24h） |
| **Log 輪替** | 7 天 |

---

## 授權 / License

MIT License — 本專案基於 [discord-lobster](https://github.com/lobster) 擴展開發。

---

*由 Arthur Bot 驅動 · Powered by Arthur Bot*  
*Google Gemini Flash · Discord API · Pure Node.js*
