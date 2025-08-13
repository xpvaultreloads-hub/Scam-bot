import TelegramBot from "node-telegram-bot-api";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ENV variables
const token = process.env.BOT_TOKEN;
const mongoURI = process.env.MONGO_URI;
const adminId = "1697591760"; // Your Telegram ID

// MongoDB Schema
const scamSchema = new mongoose.Schema({
  name: String,  // Scammer number or name
  proof: String, // Proof link or details
});
const Scam = mongoose.model("Scam", scamSchema);

// Express server
const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// Create bot (webhook mode)
const bot = new TelegramBot(token, { webHook: true });
bot.setWebHook(`${process.env.RENDER_EXTERNAL_URL}/bot${token}`);

// ADD scammer (Admin only)
bot.onText(/\/add (.+)/, async (msg, match) => {
  if (msg.from.id.toString() !== adminId) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
  }

  const [name, proof] = match[1].split(";");
  if (!name || !proof) {
    return bot.sendMessage(msg.chat.id, "Usage: /add Name;ProofURL");
  }

  await Scam.create({ name: name.trim(), proof: proof.trim() });
  bot.sendMessage(msg.chat.id, `✅ Scammer added:\nName: ${name}\nProof: ${proof}`);
});

// LIST scammers with clickable buttons
bot.onText(/\/list/, async (msg) => {
  const scammers = await Scam.find();
  if (!scammers.length) return bot.sendMessage(msg.chat.id, "📂 No scammers in database.");

  const keyboard = scammers.map((s, i) => [{
    text: `${i + 1}. ${s.name}`,
    callback_data: `scammer_${s._id}`,
  }]);

  bot.sendMessage(msg.chat.id, "📜 Scam List:\nTap a name to view proof:", {
    reply_markup: { inline_keyboard: keyboard }
  });
});

// Handle button click to show scammer details
bot.on("callback_query", async (query) => {
  const data = query.data;

  if (data.startsWith("scammer_")) {
    const id = data.split("_")[1];
    const scammer = await Scam.findById(id);

    if (scammer) {
      bot.sendMessage(query.message.chat.id,
        `🚨 *Scammer Details:*\n` +
        `📌 Name: ${scammer.name}\n` +
        `🖇 Proof: ${scammer.proof}`, { parse_mode: "Markdown" }
      );
    } else {
      bot.sendMessage(query.message.chat.id, "⚠ Scammer not found.");
    }
  }

  bot.answerCallbackQuery(query.id);
});

// REMOVE scammer (Admin only)
bot.onText(/\/remove (.+)/, async (msg, match) => {
  if (msg.from.id.toString() !== adminId) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
  }

  const name = match[1].trim();
  const result = await Scam.findOneAndDelete({ name });

  if (result) {
    bot.sendMessage(msg.chat.id, `🗑 Removed scammer: ${name}`);
  } else {
    bot.sendMessage(msg.chat.id, `⚠ No scammer found with name: ${name}`);
  }
});

// Webhook route
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot running on port ${PORT}`);
});
