import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./AuthContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Ensure this route is set up in your Express app
App.post("/api/tafsir-lesson", async (req, res) => {
  try {
    // The frontend will send the surah and verse number (e.g., "1:2")
    const { verseKey } = req.body;

    // 1. Fetch Tafsir from quran.com (ID 169 is English Tafsir Ibn Kathir)
    const tafsirResponse = await axios.get(
      `https://api.quran.com/api/v4/tafsirs/169/by_ayah/${verseKey}`,
    );
    let tafsirText = tafsirResponse.data.tafsir.text;

    // Quran.com sometimes returns HTML tags in the Tafsir, so we strip them for a clean UI
    tafsirText = tafsirText.replace(/<[^>]*>?/gm, "");

    // 2. Initialize Gemini using the free key from your .env
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Prompt the AI
    const prompt = `Act as an empathetic and knowledgeable guide. Analyze this Quranic Tafsir and provide a 2-sentence 'Daily Actionable Lesson' that a modern reader can apply to their life today to improve themselves. Do not use complex jargon.\n\nTafsir context: ${tafsirText}`;

    const result = await model.generateContent(prompt);
    const aiLesson = result.response.text();

    // 4. Send the data back to React
    res.json({
      tafsir: tafsirText,
      aiLesson: aiLesson,
    });
  } catch (error) {
    console.error("Error generating lesson:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch Tafsir or generate lesson" });
  }
});
