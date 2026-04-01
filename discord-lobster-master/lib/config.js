// config.js — Load configuration from .env or environment variables
// Zero dependencies: reads .env file manually

const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, "..", ".env");

// Load .env into process.env (real env vars take priority)
try {
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

function required(key) {
  const val = process.env[key];
  if (!val) {
    console.error(`ERROR: ${key} is required. Set it in .env or environment.`);
    process.exit(1);
  }
  return val;
}

module.exports = {
  DISCORD_BOT_TOKEN: required("DISCORD_BOT_TOKEN"),
  GEMINI_API_KEY: required("GEMINI_API_KEY"),
  GUILD_ID: required("GUILD_ID"),
  WELCOME_CHANNEL: required("WELCOME_CHANNEL_ID"),
  GENERAL_CHANNEL: required("GENERAL_CHANNEL_ID"),
  ASK_CHANNEL: process.env.ASK_CHANNEL_ID || "",
  SPAWN_CHANNEL_ID: process.env.SPAWN_CHANNEL_ID || "",
  NEWS_CHANNEL_ID: process.env.NEWS_CHANNEL_ID || "",
  ARTHUR_AGENT_CHANNEL_ID: required("ARTHUR_AGENT_CHANNEL_ID"),
  WELCOME_WEBHOOK_URL: required("WELCOME_WEBHOOK_URL"),
  GENERAL_WEBHOOK_URL: required("GENERAL_WEBHOOK_URL"),
  NEWS_WEBHOOK_URL: required("NEWS_WEBHOOK_URL"),
  POLICY_WEBHOOK_URL: process.env.POLICY_WEBHOOK_URL || "",
  BOTLOGS_WEBHOOK_URL: process.env.BOTLOGS_WEBHOOK_URL || "",
  ARTHUR_AGENT_WEBHOOK_URL: required("ARTHUR_AGENT_WEBHOOK_URL"),
  ARTHUR_BOT_USER_ID: process.env.ARTHUR_BOT_USER_ID || "",
  JAPAN_WEBHOOK_URL: process.env.JAPAN_WEBHOOK_URL || "",
  THAI_WEBHOOK_URL: process.env.THAI_WEBHOOK_URL || "",
  DUBAI_WEBHOOK_URL: process.env.DUBAI_WEBHOOK_URL || "",
  OTHERS_WEBHOOK_URL: process.env.OTHERS_WEBHOOK_URL || "",
  JAPAN_CHANNEL_ID: process.env.JAPAN_CHANNEL_ID || "",
  THAI_CHANNEL_ID: process.env.THAI_CHANNEL_ID || "",
  DUBAI_CHANNEL_ID: process.env.DUBAI_CHANNEL_ID || "",
  OTHERS_CHANNEL_ID: process.env.OTHERS_CHANNEL_ID || "",
  GEMINI_API_KEY_2: process.env.GEMINI_API_KEY_2 || "",
  GEMINI_API_KEY_GCP: process.env.GEMINI_API_KEY_GCP || "",
  BOT_NAME: process.env.BOT_NAME || "Lobster CEO \u{1F99E}",
  BOT_AVATAR_URL: process.env.BOT_AVATAR_URL || "",

  // Paths
  DATA_DIR: path.join(__dirname, "..", "data"),
  LOG_DIR: path.join(__dirname, "..", "logs"),
  MEMORY_FILE: path.join(__dirname, "..", "data", "member-memory.json"),
};
