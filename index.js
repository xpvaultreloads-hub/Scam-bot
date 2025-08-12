// index.js
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// ====== CONFIG ======
const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN";
const ADMIN_ID = 1697591760; // Your Telegram ID
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://db_Xpreloads:db_Narbu26042002@cluster0.1nmv5td.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// ====== DB MODEL ======
const scamSchema = new mongoose.Schema({
    username: String,
    scam: Boolean,
    date: { type: Date, default: Date.now }
});
const Scam = mongoose.model('Scam', scamSchema);

// ====== CONNECT DB ======
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// ====== BOT ======
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text) return;

    // Admin check
    if (chatId === ADMIN_ID && text.startsWith('/addscam')) {
        const parts = text.split(' ');
        if (parts.length < 2) return bot.sendMessage(chatId, "⚠ Usage: /addscam username");

        const username = parts[1].replace('@', '');
        await Scam.create({ username, scam: true });
        return bot.sendMessage(chatId, `✅ @${username} added to scam list.`);
    }

    if (chatId === ADMIN_ID && text.startsWith('/removescam')) {
        const parts = text.split(' ');
        if (parts.length < 2) return bot.sendMessage(chatId, "⚠ Usage: /removescam username");

        const username = parts[1].replace('@', '');
        await Scam.deleteOne({ username });
        return bot.sendMessage(chatId, `✅ @${username} removed from scam list.`);
    }

    // User check command
    if (text.startsWith('/check')) {
        const parts = text.split(' ');
        if (parts.length < 2) return bot.sendMessage(chatId, "⚠ Usage: /check username");

        const username = parts[1].replace('@', '');
        const scamData = await Scam.findOne({ username });

        if (scamData) {
            return bot.sendMessage(chatId, `🚨 @${username} is marked as SCAM!`);
        } else {
            return bot.sendMessage(chatId, `✅ @${username} is NOT in the scam list.`);
        }
    }

    // Only admin can use add/remove
    if (text.startsWith('/addscam') || text.startsWith('/removescam')) {
        return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
    }
});

// ====== STARTUP ======
console.log("🤖 Scam Checker Bot is running...");
