import TelegramBot from "node-telegram-bot-api";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ENV variables
const token = process.env.BOT_TOKEN;
const mongoURI = process.env.MONGO_URI;
const adminId = process.env.ADMIN_ID;

// MongoDB Schema
const scamSchema = new mongoose.Schema({
  name: String,
  proof: String,
});
const Scam = mongoose.model("Scam", scamSchema);

// Express server
const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// Create bot (no polling, webhook mode)
const bot = new TelegramBot(token, { webHook: true });
bot.setWebHook(`${process.env.RENDER_EXTERNAL_URL}/bot${token}`);

// Commands
bot.onText(/\/add (.+)/, async (msg, match) => {
  if (msg.from.id.toString() !== adminId) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized.");
  }

  const [name, proof] = match[1].split(";");
  if (!name || !proof) {
    return bot.sendMessage(msg.chat.id, "Usage: /add Name;ProofURL");
  }

  await Scam.create({ name, proof });
  bot.sendMessage(msg.chat.id, `✅ Scammer added:\nName: ${name}\nProof: ${proof}`);
});

bot.onText(/\/list/, async (msg) => {
  const scammers = await Scam.find();
  if (!scammers.length) return bot.sendMessage(msg.chat.id, "📂 No scammers in database.");
  
  let text = "📜 Scam List:\n\n";
  scammers.forEach(s => {
    text += `• ${s.name} - ${s.proof}\n`;
  });
  
  bot.sendMessage(msg.chat.id, text);
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
