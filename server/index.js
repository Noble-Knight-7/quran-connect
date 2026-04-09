const { getReconnectPlanForDate } = require("./reconnectPlan");

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

function stripHtml(text = "") {
  return text.replace(/<[^>]*>/g, "").trim();
}

app.use(
  cors({
    origin: ["http://localhost:3000", "https://quran-connect-one.vercel.app"],
  }),
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/tafsir-lesson", async (req, res) => {
  try {
    const { verseKey } = req.body;

    if (!verseKey) {
      return res.status(400).json({ error: "verseKey is required" });
    }

    const tafsirResponse = await axios.get(
      `https://api.quran.com/api/v4/tafsirs/169/by_ayah/${verseKey}`,
    );

    let tafsirText = tafsirResponse?.data?.tafsir?.text || "";
    tafsirText = tafsirText.replace(/<[^>]*>/g, "").trim();

    if (!tafsirText) {
      return res.status(404).json({ error: "No tafsir found for this verse" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
You are a helpful Quran study assistant.

Given this tafsir, do two things:
1. Explain the tafsir in simple modern English in 3-5 sentences.
2. Give a short practical lesson the user can apply today in 1-2 sentences.

Keep the tone reflective, warm, and easy to understand.
Do not invent facts beyond the tafsir.

Tafsir:
${tafsirText}
    `;

    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    res.json({
      tafsir: tafsirText,
      aiLesson: aiText,
    });
  } catch (error) {
    console.error(
      "tafsir-lesson error:",
      error?.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to fetch tafsir or generate lesson",
    });
  }
});
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
app.get("/api/daily-reconnect", async (req, res) => {
  try {
    const date = req.query.date;
    const { dayNumber, totalDays, item } = getReconnectPlanForDate(date);

    const verseResponse = await axios.get(
      `https://api.quran.com/api/v4/verses/by_key/${item.verseKey}`,
      {
        params: {
          language: "en",
          words: false,
          translations: "131",
          fields: "text_uthmani",
        },
      },
    );

    const verse = verseResponse?.data?.verse;

    const tafsirResponse = await axios.get(
      `https://api.quran.com/api/v4/tafsirs/169/by_ayah/${item.verseKey}`,
    );

    const arabicText = verse?.text_uthmani || "";
    const translationText = stripHtml(verse?.translations?.[0]?.text || "");
    const tafsirText = stripHtml(tafsirResponse?.data?.tafsir?.text || "");

    let aiInsight =
      "Read this verse slowly, reflect on its meaning, and ask Allah to make the Quran a daily companion in your life.";

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
      });

      const prompt = `
You are helping a Muslim reconnect with the Quran after Ramadan.

Given this verse, tafsir, and reflection prompt, generate:
1. A short heart-softening explanation in 2-4 sentences.
2. A practical action reminder in 1 sentence.

Keep it spiritually warm, concise, and easy to understand.
Do not invent anything beyond the verse and tafsir.

Verse Key: ${item.verseKey}
Verse Translation: ${translationText}
Tafsir: ${tafsirText}
Reflection Prompt: ${item.reflectionPrompt}
      `;

      const result = await model.generateContent(prompt);
      aiInsight = result.response.text();
    } catch (aiError) {
      console.error("daily-reconnect ai error:", aiError.message);
    }

    const [surahNumber, verseNumber] = item.verseKey.split(":").map(Number);

    return res.json({
      date: date || new Date().toISOString().slice(0, 10),
      dayNumber,
      totalDays,
      verseKey: item.verseKey,
      surahNumber,
      verseNumber,
      title: item.title,
      action: item.action,
      reflectionPrompt: item.reflectionPrompt,
      arabicText,
      translationText,
      tafsirText,
      aiInsight,
    });
  } catch (error) {
    console.error(
      "daily-reconnect error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      error: error?.message || "Failed to load daily reconnect session",
    });
  }
});
module.exports = app;
