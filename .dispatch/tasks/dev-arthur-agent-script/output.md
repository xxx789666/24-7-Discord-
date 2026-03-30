# dev-arthur-agent-script — Output

## Files Changed

### Created
- `discord-lobster-master/arthur-agent.js` — main Q&A agent script

### Modified
- `discord-lobster-master/lib/config.js` — added 3 new exports:
  - `ARTHUR_AGENT_CHANNEL_ID` — required, reads `ARTHUR_AGENT_CHANNEL_ID` from .env
  - `ARTHUR_AGENT_WEBHOOK_URL` — required, reads `ARTHUR_AGENT_WEBHOOK_URL` from .env
  - `ARTHUR_BOT_USER_ID` — optional (defaults `""`), used for @mention detection

## What arthur-agent.js Does

1. Fetches messages from `ARTHUR_AGENT_CHANNEL_ID` since `lastMessageId`
2. Filters messages that either:
   - Contain `<@ARTHUR_BOT_USER_ID>` (@mention), or
   - Have `message_reference` (are a reply in the channel)
   - Bot messages are always skipped
3. For each eligible message:
   - Checks `threadDepth[threadId]` < 2 (per-thread cap)
   - Checks `repliesThisRun` < 5 (per-run cap)
   - Loads `data/member-memory.json` for user personalisation context
   - Calls Gemini with Arthur's deep real estate consultant prompt (+ 3 defense lines)
   - Posts reply via `postWebhook(ARTHUR_AGENT_WEBHOOK_URL, content)` with `<@userId>` mention
4. Saves state: `data/arthur-agent-state.json` — `{ lastMessageId, processedMsgIds[], threadDepth{} }`
5. Trims `processedMsgIds` to last 300; prunes maxed-out `threadDepth` entries

## .env Variables to Add

```
ARTHUR_AGENT_CHANNEL_ID=<channel-id-for-ask-arthur-agent>
ARTHUR_AGENT_WEBHOOK_URL=<webhook-url-for-that-channel>
ARTHUR_BOT_USER_ID=<discord-bot-user-id>   # optional but recommended
```

## Cron Entry

```
*/5 * * * * cd ~/arthur-bot && node discord-lobster-master/arthur-agent.js >> logs/arthur-agent-cron.log 2>&1
```

## RPD Estimate

- Runs every 5 min = 288 runs/day
- Most runs will have 0 eligible messages (exits early, 0 RPD)
- Assuming ~30 real questions/day → ~30 RPD (well within 125 RPD budget)

## Syntax Check

`node --check arthur-agent.js` passed with no errors.
