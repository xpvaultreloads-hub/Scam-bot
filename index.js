import TelegramBot from "node-telegram-bot-api";
import fs from "fs";

// === CONFIG ===
const BOT_TOKEN = process.env.BOT_TOKEN; // set in Render environment
const ADMIN_ID = process.env.ADMIN_ID; // your Telegram user ID

// Load scam data
let scamData = [];
const loadData = () => {
  try {
    scamData = JSON.parse(fs.readFileSync("scamData.json", "utf-8"));
  } catch (err) {
    scamData = [];
  }
};
const saveData = () => {
  fs.writeFileSync("scamData.json", JSON.stringify(scamData, null, 2));
};

loadData();

// Start bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Welcome to Scam Checker Bot!\n\nSend a phone number with country code (e.g., +919876543210) to check if it's reported as a scam.`
  );
});

// Admin add scammer
bot.onText(/\/addscammer (.+)/, (msg, match) => {
  if (msg.from.id.toString() !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to add scammers.");
  }

  const input = match[1].trim();
  const firstSpace = input.indexOf(" ");
  if (firstSpace === -1) {
    return bot.sendMessage(msg.chat.id, "⚠️ Usage: /addscammer <number> <details>");
  }

  const number = input.slice(0, firstSpace);
  const details = input.slice(firstSpace + 1);

  if (scamData.find((e) => e.number === number)) {
    return bot.sendMessage(msg.chat.id, "⚠️ This number is already in the database.");
  }

  scamData.push({ number, status: "scammer", details });
  saveData();

  bot.sendMessage(msg.chat.id, `✅ Scammer number ${number} added successfully!`);
});

// Handle number check
bot.on("message", (msg) => {
  const text = msg.text.trim();

  // Ignore commands
  if (text.startsWith("/")) return;

  const found = scamData.find((entry) => entry.number === text);

  if (found) {
    bot.sendMessage(msg.chat.id, `⚠️ *Scammer detected!*`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📄 Proof", callback_data: `proof_${found.number}` }]
        ]
      }
    });
  } else {
    bot.sendMessage(msg.chat.id, `✅ No scam details available for this number.`);
  }
});

// Proof button
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const number = query.data.split("_")[1];
  const found = scamData.find((entry) => entry.number === number);

  if (found) {
    bot.sendMessage(chatId, `📄 *Proof:* ${found.details}`, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "No details found.");
  }
});
