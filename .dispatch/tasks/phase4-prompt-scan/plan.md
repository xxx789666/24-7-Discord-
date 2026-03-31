# Phase 4 — Prompt 安全掃描

- [x] 在 prompt-defense-audit-master/ 執行 npm install && npm run build 編譯工具
- [x] 建立 discord-lobster-master/prompts/ 目錄
- [x] 從各腳本萃取 Gemini prompt 字串，分別存為 .txt：
      prompts/welcome.txt
      prompts/vibes.txt
      prompts/memory.txt
      prompts/news.txt
      prompts/publisher.txt
      prompts/arthur-agent.txt
- [x] 對每個 .txt 執行 prompt-defense-audit --zh --file 掃描，記錄分數與等級
- [x] 將掃描報告寫入 discord-lobster-master/prompts/audit-report.md
- [x] 補強所有低於 B 級（70分）的 prompt，補入三行防禦語句後重新掃描確認
- [x] 更新 PLAN.md：Phase 4 所有項目標記 [x]
- [x] 寫入 .dispatch/tasks/phase4-prompt-scan/output.md
