import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

function SurahReader() {
  const { surahNumber } = useParams();
  const navigate = useNavigate();
  const [surah, setSurah] = useState(null);
  const [verses, setVerses] = useState([]);
  const [translation, setTranslation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize] = useState("text-3xl");

  // --- NEW STATE FOR THE REFLECTION ENGINE ---
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [sidebarLoading, setSidebarLoading] = useState(false);
  // We will fill these with actual API data in the next step
  const [tafsirData, setTafsirData] = useState("");
  const [aiLesson, setAiLesson] = useState("");
  const [playing, setPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [activeAyah, setActiveAyah] = useState(null);
  const { user } = useAuth();

  const playSurah = async () => {
    if (playing) {
      currentAudio.pause();
      setPlaying(false);
      setActiveAyah(null);
      return;
    }

    // Fetching from Quran Foundation Audio API (Reciter: Mishary Rashid Alafasy)
    const res = await fetch(
      `https://api.quran.com/api/v4/chapter_recitations/7/${surahNumber}`,
    );
    const data = await res.json();
    const audioUrl = data.audio_file.audio_url;

    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setPlaying(true);

    // This is the "Technical Execution" part:
    // We listen for time updates and try to sync the highlight
    audio.ontimeupdate = () => {
      // In a full implementation, you'd fetch 'timestamps' from api.quran.com/api/v4/recitations
      // For the hackathon, we can simulate the highlight moving based on duration / verse count
      const progress = audio.currentTime / audio.duration;
      const verseIndex = Math.floor(progress * verses.length);
      setActiveAyah(verses[verseIndex]?.numberInSurah);
    };

    audio.onended = () => {
      setPlaying(false);
      setActiveAyah(null);
    };

    audio.play();
  };

  useEffect(() => {
    setLoading(true);

    // Fetch Arabic + English translation in one call
    fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-simple,en.asad`,
    )
      .then((res) => res.json())
      .then((data) => {
        const arabic = data.data[0];
        const english = data.data[1];
        setSurah(arabic);
        setVerses(arabic.ayahs);
        setTranslation(english.ayahs);
        setLoading(false);
        window.scrollTo(0, 0);
      });
  }, [surahNumber]);

  // --- NEW FUNCTION: OPEN SIDEBAR ---
  const handleVerseClick = async (verse, translationText) => {
    setSelectedVerse({ ...verse, translationText });
    setIsSidebarOpen(true);
    setSidebarLoading(true);
    setReflectionText("");

    // Construct the verse key format required by quran.com (e.g., "1:1")
    const verseKey = `${surah.number}:${verse.numberInSurah}`;

    try {
      // 1. Fetch Tafsir directly from Quran.com
      const tafsirRes = await fetch(
        `https://api.quran.com/api/v4/tafsirs/169/by_ayah/${verseKey}`,
      );
      const tafsirData = await tafsirRes.json();

      // Clean HTML tags from the Tafsir text
      const cleanTafsirText = tafsirData.tafsir.text.replace(/<[^>]*>?/gm, "");
      setTafsirData(cleanTafsirText);

      // 2. Initialize Gemini directly in React
      const genAI = new GoogleGenerativeAI(
        process.env.REACT_APP_GEMINI_API_KEY,
      );
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      // 3. Prompt the AI
      const prompt = `Explain the tafsir of the verse in simple sentences.\n\nTafsir context: ${cleanTafsirText}`;

      const result = await model.generateContent(prompt);
      const lessonText = result.response.text();

      setAiLesson(lessonText);
    } catch (error) {
      console.error("Error fetching reflection data:", error);
      setTafsirData("Could not load Tafsir at this time. Please try again.");
      setAiLesson(
        "Take a moment to reflect on what this verse means to you today.",
      );
    } finally {
      setSidebarLoading(false);
    }
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim() || !user) return; // Ensure user is logged in
    try {
      await addDoc(collection(db, "reflections"), {
        userId: user.uid, // This connects the reflection to the logged-in user
        surahNumber: parseInt(surahNumber),
        verseNumber: selectedVerse.numberInSurah,
        userReflection: reflectionText,
        aiLesson: aiLesson,
        timestamp: serverTimestamp(),
      });
      setReflectionText("");
      alert("✨ Reflection saved!");
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Save error:", error);
      alert("⚠️ Error saving.");
    }
  };

  const fontSizes = [
    { label: "S", value: "text-2xl" },
    { label: "M", value: "text-3xl" },
    { label: "L", value: "text-4xl" },
  ];

  const goToPrev = () => {
    if (Number(surahNumber) > 1) navigate(`/quran/${Number(surahNumber) - 1}`);
  };

  const goToNext = () => {
    if (Number(surahNumber) < 114)
      navigate(`/quran/${Number(surahNumber) + 1}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Loading surah...</p>
      </div>
    );
  }

  return (
    <div className="relative flex overflow-hidden min-h-screen">
      {/* MAIN CONTENT AREA */}
      <div
        className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "mr-96" : "mr-0"}`}
      >
        <div className="max-w-3xl mx-auto px-4 py-10">
          {/* Header */}
          <div className="bg-white rounded-2xl p-6 shadow-md mb-6 text-center">
            <p className="text-green-500 text-sm font-medium mb-1">
              Surah {surah.number} • {surah.revelationType} •{" "}
              {surah.numberOfAyahs} verses
            </p>
            <h1 className="text-3xl font-bold text-green-800 mb-1">
              {surah.englishName}
            </h1>
            <p className="text-gray-400 text-sm mb-3">
              {surah.englishNameTranslation}
            </p>
            <p
              className="text-4xl text-green-700"
              style={{ fontFamily: "serif" }}
            >
              {surah.name}
            </p>
            <button
              onClick={playSurah}
              className={`mt-4 px-6 py-2 rounded-full font-bold transition-all ${playing ? "bg-red-100 text-red-600" : "bg-green-700 text-white"}`}
            >
              {playing ? "Stop Recitation" : "▶ Listen to Surah"}
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6 bg-white rounded-2xl px-5 py-3 shadow-sm">
            <div className="flex items-center gap-1">
              {fontSizes.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFontSize(f.value)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    fontSize === f.value
                      ? "bg-green-700 text-white"
                      : "text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`text-sm px-4 py-1.5 rounded-xl transition-all font-medium ${
                showTranslation
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {showTranslation ? "Translation on" : "Translation off"}
            </button>
          </div>

          {surah.number !== 1 && surah.number !== 9 && (
            <div className="text-center mb-8">
              <p
                className="text-3xl text-green-800"
                style={{ fontFamily: "serif" }}
              >
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
            </div>
          )}

          {/* Verses */}
          <div className="flex flex-col gap-6">
            {verses.map((verse, index) => (
              <div
                key={verse.numberInSurah}
                onClick={() =>
                  handleVerseClick(verse, translation[index]?.text)
                }
                // This dynamic className adds the green glow when the audio reaches this specific Ayah
                className={`bg-white rounded-2xl p-6 shadow-sm transition-all cursor-pointer border-2 ${
                  activeAyah === verse.numberInSurah
                    ? "border-green-500 ring-4 ring-green-50"
                    : "border-transparent"
                } hover:border-green-200`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold">
                    {verse.numberInSurah}
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                    Click to Reflect
                  </span>
                </div>

                <p
                  className={`${fontSize} text-right text-green-900 leading-loose mb-4`}
                  dir="rtl"
                  style={{ fontFamily: "serif", lineHeight: "2.2" }}
                >
                  {verse.text}
                </p>

                {showTranslation && (
                  <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-4 italic">
                    {translation[index]?.text}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Prev / Next navigation */}
          <div className="flex justify-between mt-8 gap-4">
            <button
              onClick={goToPrev}
              disabled={Number(surahNumber) === 1}
              className="flex-1 bg-white border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-600 hover:border-green-300 hover:text-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Previous surah
            </button>
            <button
              onClick={() => navigate("/quran")}
              className="bg-green-50 border border-green-100 rounded-2xl py-3 px-6 text-sm font-medium text-green-700 hover:bg-green-100 transition-all"
            >
              All surahs
            </button>
            <button
              onClick={goToNext}
              disabled={Number(surahNumber) === 114}
              className="flex-1 bg-white border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-600 hover:border-green-300 hover:text-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next surah →
            </button>
          </div>
        </div>
      </div>

      {/* --- REFLECTION SIDEBAR --- */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-gray-50 border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedVerse && (
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">
                Surah {surah.englishName} : {selectedVerse.numberInSurah}
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-gray-400 hover:text-red-500"
              >
                ✕ Close
              </button>
            </div>

            {/* Verse Context */}
            <div className="mb-6">
              <p
                className="text-xl text-right text-green-900 mb-3"
                dir="rtl"
                style={{ fontFamily: "serif" }}
              >
                {selectedVerse.text}
              </p>
              <p className="text-sm text-gray-600 italic">
                "{selectedVerse.translationText}"
              </p>
            </div>

            {sidebarLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 animate-pulse">
                  Generating AI Lesson & Tafsir...
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-6">
                {/* AI Lesson Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border border-green-200">
                  <h3 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    ✨ Ayaah Explanation
                  </h3>
                  <p className="text-sm text-green-900 font-medium leading-relaxed">
                    {aiLesson}
                  </p>
                </div>

                {/* Tafsir Context */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Tafsir Insight
                  </h3>
                  <div className="text-sm text-gray-700 bg-white p-4 rounded-xl border border-gray-100 shadow-sm leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                    {tafsirData}
                  </div>
                </div>

                {/* Reflection Input */}
                <div className="mt-auto">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    My Personal Reflection
                  </label>
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="How does this apply to my life right now? What can I improve?"
                    className="w-full h-32 p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none shadow-inner"
                  />
                  <button
                    onClick={handleSaveReflection}
                    disabled={!reflectionText.trim()}
                    className="w-full mt-3 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Save to Journal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SurahReader;
