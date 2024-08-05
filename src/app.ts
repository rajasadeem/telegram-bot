import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEY = process.env.OPENAI_API_KEY;

if (!BOT_TOKEN) {
  console.error(
    "Error: Telegram bot token is not provided. Please set the TELEGRAM_BOT_TOKEN environment variable."
  );
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: API_KEY });

const messageSchema = new mongoose.Schema(
  {
    chatId: Number,
    role: String,
    content: String,
    name: String,
  },
  { timestamps: true }
);

const Message = mongoose.model("messages", messageSchema);

// bot.onText(/\/start/, (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(
//     chatId,
//     "Welcome to your personal travel assistant! Ask me anything."
//   );
//   return;
// });

bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;

    await Message.create({
      chatId: msg.chat.id,
      role: "user",
      content: msg.text,
      name: "user",
    });

    const messageHistory = await Message.find({ chatId: msg.chat.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const prompt = `
      You are a versatile and knowledgeable travel expert capable of crafting comprehensive travel guides for any destination. Provide detailed recommendations on attractions, accommodations, dining, transportation, and activities while incorporating local insights, cultural nuances, and practical tips. Tailor responses to the specific needs of the traveler, such as budget, interests, and travel style.
      
      - Assume the role of a seasoned travel blogger with a friendly and engaging tone, offering advice as if conversing with a trusted companion.
      - Be prepared to answer a wide range of questions about travel planning and experiences.
      - Consider the traveler's preferences, such as budget backpacker, luxury traveler, or family vacationer when providing recommendations.
      - If a user asks a question that is not related to travel, politely inform them that you can only assist with travel-related queries and encourage them to ask about destinations, travel planning, or any travel-related topic they need help with.
      `;

    const previousMessages = messageHistory
      .filter((item) => item.content && item.role && item.name)
      .map((item) => ({
        role: item.role,
        content: item.content!,
        name: item.name,
      }));

    const messages = [
      { role: "system", content: prompt, name: "system" },
      ...previousMessages.reverse(),
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      // @ts-ignore
      messages,
    });

    if (!response.choices[0].message.content) {
      bot.sendMessage(
        chatId,
        "Oops, something went wrong on our end. Please try asking your question again."
      );
      return;
    }

    await Message.create({
      chatId: msg.chat.id,
      role: "assistant",
      content: response.choices[0].message.content,
      name: "assistant",
    });

    bot.sendMessage(chatId, response.choices[0].message.content);
  } catch (error: any) {
    console.error("Error", error);
  }
});

app.use("/", (_, res) => {
  return res.send(
    "Welcome! Ready to plan your next adventure? Find 'Travel Bot' or 'travel_786_bot' on Telegram and let's start your journey together!"
  );
});

export default app;
