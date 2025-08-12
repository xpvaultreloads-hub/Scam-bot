import TelegramBot from "node-telegram-bot-api";

// ==================== CONFIG ====================
const ADMIN_ID = 123456789; // <- Replace with YOUR Telegram user ID
const token = process.env.BOT_TOKEN; // Set BOT_TOKEN in Render's Environment Variables
// ================================================

// In-memory scammer database
let scammers = {};

// Create bot
const bot = new TelegramBot(token, { polling: true });

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const message = `👋 Welcome to Scam Checker Bot!

📌 *How to use:*
1️⃣ Send a phone number with country code (e.g., +911234567890).
2️⃣ The bot will check if it's marked as a scammer.

🛡 *Admin Commands:*
/addscammer +<number> <proof>
/removescammer +<number>

⚠️ Only the admin can add or remove scammers.`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// User sends a number to check
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Skip commands
  if (text.startsWith("/")) return;

  if (scammers[text]) {
    bot.sendMessage(chatId, `🚨 *SCAMMER ALERT!* 🚨\n📞 ${text}\n📄 Proof: ${scammers[text]}`, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, `✅ No scam details available for: ${text}`);
  }
});

// Add scammer (Admin only)
bot.onText(/\/addscammer (.+) (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
  }

  const number = match[1];
  const proof = match[2];
  scammers[number] = proof;

  bot.sendMessage(msg.chat.id, `✅ Added scammer: ${number}\n📄 Proof: ${proof}`);
});

// Remove scammer (Admin only)
bot.onText(/\/removescammer (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
  }

  const number = match[1];
  if (scammers[number]) {
    delete scammers[number];
    bot.sendMessage(msg.chat.id, `✅ Removed scammer: ${number}`);
  } else {
    bot.sendMessage(msg.chat.id, `ℹ️ No record found for: ${number}`);
  }
});
