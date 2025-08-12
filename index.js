import TelegramBot from "node-telegram-bot-api";
import express from "express";

// ================== CONFIG ==================
const BOT_TOKEN = process.env.BOT_TOKEN; // put your token in Render environment
const ADMIN_ID = 123456789; // replace with your Telegram numeric ID
// ============================================

// Simple in-memory scam database (for now)
let scamDatabase = {
  // Example:
  // "+911234567890": {
  //   scammer: true,
  //   proof: "This person took money and blocked the buyer."
  // }
};

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ========= BOT COMMANDS =========

// /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Welcome to Scam Checker Bot!\n\n` +
      `📱 Send a phone number (with country code, e.g. +91XXXXXXXXXX) to check if it is reported as a scammer.`
  );
});

// Check number
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Ignore commands
  if (!text || text.startsWith("/")) return;

  if (scamDatabase[text]) {
    const scamInfo = scamDatabase[text];
    let response = `🚨 SCAM ALERT!\n\nNumber: ${text}\nStatus: ✅ Scammer Reported`;
    const proofButton = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📄 View Proof", callback_data: `proof_${text}` }
          ]
        ]
      }
    };
    bot.sendMessage(chatId, response, proofButton);
  } else {
    bot.sendMessage(chatId, `✅ No scam reports found for ${text}.`);
  }
});

// Proof button handler
bot.on("callback_query", (query) => {
  const data = query.data;
  if (data.startsWith("proof_")) {
    const number = data.replace("proof_", "");
    const proof = scamDatabase[number]?.proof || "No proof available.";
    bot.sendMessage(query.message.chat.id, `📄 Proof for ${number}:\n\n${proof}`);
  }
});

// Admin command: Add scammer
bot.onText(/\/addscammer (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
  }

  const number = match[1].trim();
  scamDatabase[number] = { scammer: true, proof: "" };
  bot.sendMessage(msg.chat.id, `✅ Scammer number ${number} added.`);
});

// Admin command: Add proof
bot.onText(/\/addproof (.+) \| (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
  }

  const number = match[1].trim();
  const proof = match[2].trim();

  if (!scamDatabase[number]) {
    return bot.sendMessage(msg.chat.id, "⚠️ This number is not yet in scammer list.");
  }

  scamDatabase[number].proof = proof;
  bot.sendMessage(msg.chat.id, `📄 Proof added for ${number}.`);
});

// ========== EXPRESS SERVER ==========
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running");
});
