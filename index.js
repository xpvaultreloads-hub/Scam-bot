import TelegramBot from "node-telegram-bot-api";
import { MongoClient } from "mongodb";

// =================== CONFIG ===================
const BOT_TOKEN = process.env.BOT_TOKEN; // Put in Render ENV
const MONGODB_URI = process.env.MONGODB_URI; // Put in Render ENV
const ADMIN_ID = 1697591760; // Your Telegram numeric ID

// =================== INIT BOT ===================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
let scammersCollection;

// =================== MONGODB CONNECT ===================
async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db("scamCheckerDB");
        scammersCollection = db.collection("scammers");
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
    }
}
connectDB();

// =================== COMMANDS ===================

// START
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        `👋 Welcome to Scam Checker Bot!\n\n` +
        `You can:\n` +
        `• /check <number> → Check if number is in scammer list\n` +
        `• /addscammer <number> (Admin only)\n` +
        `• /addproof <number> <proof details> (Admin only)\n\n` +
        `Your Telegram ID: ${msg.from.id}`
    );
});

// ADD SCAMMER (Admin only)
bot.onText(/\/addscammer (.+)/, async (msg, match) => {
    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
    }

    const scamNumber = match[1].trim();
    if (!scamNumber) return bot.sendMessage(msg.chat.id, "⚠️ Please provide a scammer number.");

    await scammersCollection.updateOne(
        { number: scamNumber },
        { $set: { number: scamNumber } },
        { upsert: true }
    );

    bot.sendMessage(msg.chat.id, `✅ Scammer number ${scamNumber} added successfully.`);
});

// ADD PROOF (Admin only)
bot.onText(/\/addproof (.+)/, async (msg, match) => {
    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
    }

    const args = match[1].split(" ");
    const scamNumber = args.shift();
    const proofDetails = args.join(" ");

    if (!scamNumber || !proofDetails) {
        return bot.sendMessage(msg.chat.id, "⚠️ Usage: /addproof <number> <proof details>");
    }

    await scammersCollection.updateOne(
        { number: scamNumber },
        { $set: { proof: proofDetails } },
        { upsert: true }
    );

    bot.sendMessage(msg.chat.id, `📂 Proof added for ${scamNumber}.`);
});

// CHECK SCAMMER
bot.onText(/\/check (.+)/, async (msg, match) => {
    const scamNumber = match[1].trim();
    if (!scamNumber) return bot.sendMessage(msg.chat.id, "⚠️ Please provide a number to check.");

    const scammer = await scammersCollection.findOne({ number: scamNumber });
    if (scammer) {
        bot.sendMessage(
            msg.chat.id,
            `🚨 This number is in the scammer list!\n\nNumber: ${scammer.number}\nProof: ${scammer.proof || "No proof added"}`
        );
    } else {
        bot.sendMessage(msg.chat.id, "✅ This number is not in the scammer list.");
    }
});
