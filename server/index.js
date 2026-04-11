const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});

const { getReconnectPlanForDate } = require("./reconnectPlan");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getDb } = require("./firebaseAdmin");
const qfRoutes = require("./qfRoutes");

console.log("ENV CHECK", {
  QF_CLIENT_ID_PRESENT: Boolean(process.env.QF_CLIENT_ID),
  QF_CLIENT_SECRET_PRESENT: Boolean(process.env.QF_CLIENT_SECRET),
});

const app = express();
const PORT = process.env.PORT || 5000;

function stripHtml(text = "") {
  return text.replace(/<[^>]*>/g, "").trim();
}

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://quran-connect-one.vercel.app",
];

const allowedOriginPatterns = [
  /^https:\/\/quran-connect(?:-[a-zA-Z0-9-]+)?\.vercel\.app$/,
];

const envAllowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (envAllowedOrigins.includes(origin)) {
    return true;
  }

  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/qf", qfRoutes);

app.get("/api/health", (req, res) => {
  try {
    getDb();
    return res.json({
      ok: true,
      firebaseConfigured: true,
      firebaseError: null,
    });
  } catch (error) {
    return res.json({
      ok: true,
      firebaseConfigured: false,
      firebaseError: error.message,
    });
  }
});

app.get("/api/daily-reconnect", async (req, res) => {
  let db;

  try {
    db = getDb();
  } catch (error) {
    console.error("Firebase init error:", error.message);
    return res.status(503).json({
      error: "Firebase Admin is not configured correctly on the server.",
    });
  }

  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const cacheRef = db.collection("dailyReconnectCache").doc(date);
    const cacheSnap = await cacheRef.get();

    if (cacheSnap.exists) {
      return res.json(cacheSnap.data());
    }

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

    const disableAI = process.env.DISABLE_AI_RECONNECT === "true";

    if (!disableAI) {
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
    }

    const [surahNumber, verseNumber] = item.verseKey.split(":").map(Number);

    const payload = {
      date,
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
      cachedAt: new Date().toISOString(),
    };

    await cacheRef.set(payload);

    return res.json(payload);
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

app.post("/api/verse-reflection", async (req, res) => {
  try {
    const { verseKey, translationText, tafsirText, surahName, verseNumber } =
      req.body;

    if (!verseKey) {
      return res.status(400).json({ error: "verseKey is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    const prompt = `
You are a thoughtful Quran reflection assistant.

Given the Quran verse translation and tafsir below, write a short reflection for the user.

Rules:
- Write 3-5 sentences.
- Keep it spiritually warm, clear, and grounded.
- Do not invent facts beyond the verse and tafsir.
- Focus on personal reflection, sincerity, worship, character, or trust in Allah where appropriate.
- End with one short practical takeaway sentence.

Verse Key: ${verseKey}
Surah: ${surahName || ""}
Ayah: ${verseNumber || ""}
Translation: ${translationText || ""}
Tafsir: ${tafsirText || ""}
    `;

    const result = await model.generateContent(prompt);
    const reflection = result.response.text();

    return res.json({ reflection });
  } catch (error) {
    console.error(
      "verse-reflection error:",
      error?.response?.data || error.message,
    );

    return res.status(500).json({
      error: error?.message || "Failed to generate verse reflection",
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
