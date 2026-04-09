const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
