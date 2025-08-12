import TelegramBot from 'node-telegram-bot-api';
import mongoose from 'mongoose';

// ==== CONFIG ====
const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const ADMIN_ID = 1697591760; // Your Telegram numeric ID
const MONGO_URI = 'mongodb+srv://db_Xpreloads:db_Narbu26042002@cluster0.1nmv5td.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// ==== DATABASE SETUP ====
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const scamSchema = new mongoose.Schema({
  number: String,
  proof: String,
});

const Scam = mongoose.model('Scam', scamSchema);

// ==== BOT SETUP ====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==== START COMMAND ====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Welcome to the Scam Checker Bot!
Send /check <number_with_country_code> to verify if a number is a scammer.
📌 Example: /check +919876543210`
  );
});

// ==== CHECK SCAMMER ====
bot.onText(/\/check (.+)/, async (msg, match) => {
  const number = match[1];
  const scammer = await Scam.findOne({ number });

  if (scammer) {
    bot.sendMessage(
      msg.chat.id,
      `🚨 *SCAMMER FOUND!* 🚨\n📞 Number: ${scammer.number}`,
      { parse_mode: 'Markdown' }
    );
    bot.sendMessage(msg.chat.id, `📂 Proof: ${scammer.proof}`);
  } else {
    bot.sendMessage(msg.chat.id, `✅ No scam reports found for ${number}.`);
  }
});

// ==== ADD SCAMMER (ADMIN ONLY) ====
bot.onText(/\/addscammer (.+)/, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, '❌ You are not authorized to use this command.');
  }

  const number = match[1];
  const exists = await Scam.findOne({ number });
  if (exists) {
    return bot.sendMessage(msg.chat.id, '⚠️ This number is already marked as a scammer.');
  }

  const newScammer = new Scam({ number });
  await newScammer.save();

  bot.sendMessage(msg.chat.id, `✅ Added ${number} to scammer list.`);
});

// ==== ADD PROOF (ADMIN ONLY) ====
bot.onText(/\/addproof (.+) (.+)/, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, '❌ You are not authorized to use this command.');
  }

  const number = match[1];
  const proof = match[2];

  const scammer = await Scam.findOne({ number });
  if (!scammer) {
    return bot.sendMessage(msg.chat.id, '⚠️ This number is not in scammer list. Add it first.');
  }

  scammer.proof = proof;
  await scammer.save();

  bot.sendMessage(msg.chat.id, `✅ Added proof for ${number}.`);
});
