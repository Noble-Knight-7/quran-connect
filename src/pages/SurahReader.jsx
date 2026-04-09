import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

const API_BASE = "https://api.quran.com/api/v4";
const DEFAULT_RECITATION_ID = 7;
const DEFAULT_TRANSLATION_ID = 20;
const DEFAULT_TAFSIR_ID = 169;

const FALLBACK_TRANSLATIONS = [
  { id: 20, name: "The Clear Quran", language_name: "English" },
  { id: 131, name: "Saheeh International", language_name: "English" },
  { id: 85, name: "Abdul Haleem", language_name: "English" },
];

const FALLBACK_TAFSIRS = [
  { id: 169, name: "Tafsir Ibn Kathir", language_name: "English" },
  { id: 16, name: "Maarif-ul-Quran", language_name: "English" },
  { id: 168, name: "Tafheem ul Quran", language_name: "English" },
];

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const renderHtml = (value = "") => ({ __html: String(value || "") });

const extractVerseNumber = (verseKey = "") =>
  Number(String(verseKey).split(":")[1] || 0);

const getNestedText = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.name === "string") return value.name;
  if (typeof value.translation === "string") return value.translation;
  return "";
};

async function fetchAllVersesByChapter(
  chapterNumber,
  translationId,
  recitationId,
) {
  const perPage = 50;
  let page = 1;
  let allVerses = [];

  while (true) {
    const params = new URLSearchParams({
      language: "en",
      words: "true",
      translations: String(translationId),
      audio: String(recitationId),
      fields: [
        "text_uthmani",
        "verse_key",
        "verse_number",
        "juz_number",
        "hizb_number",
        "rub_number",
        "page_number",
        "ruku_number",
        "manzil_number",
      ].join(","),
      word_fields: "text_uthmani,translation,transliteration,code_v2",
      translation_fields: "resource_name,text",
      page: String(page),
      per_page: String(perPage),
    });

    const response = await fetch(
      `${API_BASE}/verses/by_chapter/${chapterNumber}?${params}`,
    );
    if (!response.ok) {
      throw new Error(`Failed loading verses: ${response.status}`);
    }

    const data = await response.json();
    const chunk = data.verses || [];
    allVerses = allVerses.concat(chunk);

    if (chunk.length < perPage) break;
    page += 1;
  }

  return allVerses;
}

async function fetchTranslationMap(chapterNumber, translationId) {
  const res = await fetch(
    `${API_BASE}/quran/translations/${translationId}?chapter_number=${chapterNumber}`,
  );
  if (!res.ok) {
    throw new Error(`Failed loading translation map: ${res.status}`);
  }
  const data = await res.json();
  const map = {};
  (data.translations || []).forEach((item) => {
    map[item.verse_key] = item;
  });
  return map;
}

function SurahReader() {
  const { surahNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [surah, setSurah] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [showWordAnalysis, setShowWordAnalysis] = useState(false);
  const [fontSize, setFontSize] = useState("text-3xl");
  const [displayBismillah, setDisplayBismillah] = useState(false);

  const [translationOptions, setTranslationOptions] = useState(
    FALLBACK_TRANSLATIONS,
  );
  const [tafsirOptions, setTafsirOptions] = useState(FALLBACK_TAFSIRS);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [tafsirId, setTafsirId] = useState(DEFAULT_TAFSIR_ID);
  const [recitationId] = useState(DEFAULT_RECITATION_ID);

  const [selectedVerse, setSelectedVerse] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [aiLesson, setAiLesson] = useState("");
  const [footnotes, setFootnotes] = useState({});

  const [tafsirData, setTafsirData] = useState("");
  const [tafsirLoading] = useState(false); // Added missing state if you plan to use it inline

  const [isSurahPlaying, setIsSurahPlaying] = useState(false);
  const [playingVerseKey, setPlayingVerseKey] = useState(null);
  const [activeAyah, setActiveAyah] = useState(null);

  const surahAudioRef = useRef(null);
  const verseAudioRef = useRef(null);
  const surahQueueRef = useRef([]);
  const surahQueueIndexRef = useRef(0);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finishingSurah, setFinishingSurah] = useState(false);

  const handleFinishSurah = async () => {
    if (!user || !surah) return;
    if (isFinished || finishingSurah) return;

    try {
      setFinishingSurah(true);

      const today = new Date();
      const localDateKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const userRef = doc(db, "users", user.uid);
      const historyRef = doc(db, "users", user.uid, "history", localDateKey);

      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          completedSurahCount: 1,
          completedSurahs: [Number(surahNumber)],
          lastFinishedSurah: Number(surahNumber),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, {
          completedSurahCount: increment(1),
          completedSurahs: arrayUnion(Number(surahNumber)),
          lastFinishedSurah: Number(surahNumber),
          updatedAt: serverTimestamp(),
        });
      }

      const historySnap = await getDoc(historyRef);

      if (!historySnap.exists()) {
        await setDoc(historyRef, {
          date: localDateKey,
          count: 1,
          surahsCompleted: [Number(surahNumber)],
          lastSurahFinished: Number(surahNumber),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(historyRef, {
          count: increment(1),
          surahsCompleted: arrayUnion(Number(surahNumber)),
          lastSurahFinished: Number(surahNumber),
          updatedAt: serverTimestamp(),
        });
      }

      setIsFinished(true);
    } catch (finishError) {
      console.error("Finish surah error:", finishError);
    } finally {
      setFinishingSurah(false);
    }
  };

  const fontSizes = [
    { label: "S", value: "text-2xl" },
    { label: "M", value: "text-3xl" },
    { label: "L", value: "text-4xl" },
  ];

  const selectedTranslationLabel = useMemo(() => {
    return (
      translationOptions.find(
        (item) => String(item.id) === String(translationId),
      )?.name || "Translation"
    );
  }, [translationId, translationOptions]);

  const selectedTafsirLabel = useMemo(() => {
    return (
      tafsirOptions.find((item) => String(item.id) === String(tafsirId))
        ?.name || "Tafsir"
    );
  }, [tafsirId, tafsirOptions]);

  const stopVerseAudio = () => {
    if (verseAudioRef.current) {
      verseAudioRef.current.pause();
      verseAudioRef.current.currentTime = 0;
      verseAudioRef.current.onended = null;
      verseAudioRef.current = null;
    }
    setPlayingVerseKey(null);
  };

  const stopSurahPlayback = () => {
    if (surahAudioRef.current) {
      surahAudioRef.current.pause();
      // surahAudioRef.current.currentTime = 0;
      surahAudioRef.current.onended = null;
      surahAudioRef.current = null;
    }
    surahQueueRef.current = [];
    surahQueueIndexRef.current = 0;
    setIsSurahPlaying(false);
    setActiveAyah(null);
  };

  const playSurahQueueAtIndex = (index) => {
    const queue = surahQueueRef.current;
    if (!queue[index]) {
      stopSurahPlayback();
      return;
    }

    const verse = queue[index];
    const audioUrl = verse.audio?.url;
    if (!audioUrl) {
      playSurahQueueAtIndex(index + 1);
      return;
    }

    if (surahAudioRef.current) {
      surahAudioRef.current.pause();
      surahAudioRef.current.currentTime = 0;
      surahAudioRef.current.onended = null;
    }

    const audio = new Audio(
      audioUrl.startsWith("http")
        ? audioUrl
        : `https://verses.quran.com/${audioUrl}`,
    );

    surahAudioRef.current = audio;
    surahQueueIndexRef.current = index;
    setIsSurahPlaying(true);
    setActiveAyah(verse.verse_number || extractVerseNumber(verse.verse_key));

    audio.onended = () => {
      playSurahQueueAtIndex(index + 1);
    };

    audio.play().catch((playError) => {
      console.error("Could not play surah recitation", playError);
      stopSurahPlayback();
    });
  };

  const handlePlayPauseSurah = () => {
    if (!verses.length) return;

    stopVerseAudio();

    if (isSurahPlaying && surahAudioRef.current) {
      stopSurahPlayback();
      return;
    }

    surahQueueRef.current = verses.filter((verse) => verse.audio?.url);
    surahQueueIndexRef.current = 0;
    playSurahQueueAtIndex(0);
  };

  const handleInlineSurahToggle = (e) => {
    e.stopPropagation();
    if (!surahAudioRef.current) return;

    if (isSurahPlaying) {
      surahAudioRef.current.pause();
      setIsSurahPlaying(false);
    } else {
      surahAudioRef.current.play();
      setIsSurahPlaying(true);
    }
  };
  const handleVerseAudioToggle = (verse) => {
    stopSurahPlayback();
    const audioUrl = verse.audio?.url;
    if (!audioUrl) return;

    if (playingVerseKey === verse.verse_key && verseAudioRef.current) {
      stopVerseAudio();
      return;
    }

    stopVerseAudio();

    const audio = new Audio(
      audioUrl.startsWith("http")
        ? audioUrl
        : `https://verses.quran.com/${audioUrl}`,
    );
    verseAudioRef.current = audio;
    setPlayingVerseKey(verse.verse_key);

    audio.onended = () => {
      stopVerseAudio();
    };

    audio.play().catch((playError) => {
      console.error("Could not play verse audio", playError);
      stopVerseAudio();
    });
  };

  const loadSidebarContent = async (verse) => {
    if (!verse) return;

    setSidebarLoading(true);
    setAiLesson("");
    setFootnotes({});
    setTafsirData("");

    try {
      const [tafsirRes, translationRes] = await Promise.all([
        fetch(`${API_BASE}/tafsirs/${tafsirId}/by_ayah/${verse.verse_key}`),
        fetch(
          `${API_BASE}/quran/translations/${translationId}?chapter_number=${surahNumber}&fields=verse_key,text,resource_name&foot_notes=true`,
        ),
      ]);

      let cleanTafsirText =
        "Could not load tafsir at this time. Please try again.";
      if (tafsirRes.ok) {
        const tafsirPayload = await tafsirRes.json();
        cleanTafsirText =
          stripHtml(tafsirPayload.tafsir?.text || "") || cleanTafsirText;
      }
      setTafsirData(cleanTafsirText);

      if (translationRes.ok) {
        const translationPayload = await translationRes.json();
        const matchingTranslation = (
          translationPayload.translations || []
        ).find((item) => item.verse_key === verse.verse_key);
        setFootnotes(matchingTranslation?.foot_notes || {});
      }

      if (process.env.GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-flash-latest",
        });
        const prompt = `Explain the tafsir of Quran verse ${verse.verse_key} in 3-5 short, simple sentences for an everyday reader. Focus on spiritual lesson and practical takeaway.

Verse translation: ${stripHtml(verse.translationText)}

Tafsir context: ${cleanTafsirText}`;
        const result = await model.generateContent(prompt);
        setAiLesson(result.response.text());
      } else {
        setAiLesson(
          "Reflect on what Allah is teaching here, and identify one action you can take today.",
        );
      }
    } catch (sidebarError) {
      console.error("Error fetching reflection data", sidebarError);
      setTafsirData("Could not load tafsir at this time. Please try again.");
      setAiLesson(
        "Take a moment to reflect on what this verse means to you today.",
      );
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadResources() {
      try {
        const [translationsRes, tafsirsRes] = await Promise.all([
          fetch(`${API_BASE}/resources/translations?language=en`),
          fetch(`${API_BASE}/resources/tafsirs?language=en`),
        ]);

        const translationsData = translationsRes.ok
          ? await translationsRes.json()
          : { translations: FALLBACK_TRANSLATIONS };
        const tafsirsData = tafsirsRes.ok
          ? await tafsirsRes.json()
          : { tafsirs: FALLBACK_TAFSIRS };

        if (!cancelled) {
          const englishTranslations = (
            translationsData.translations || []
          ).filter((item) => {
            const language = String(item.language_name || "").toLowerCase();
            const name = String(item.name || "").toLowerCase();
            const author = String(item.author_name || "").toLowerCase();

            const isEnglish = language.includes("english");
            const isTransliteration =
              name.includes("transliteration") ||
              author.includes("transliteration");

            return isEnglish && !isTransliteration;
          });
          const englishTafsirs = (tafsirsData.tafsirs || []).filter((item) =>
            String(item.language_name || "")
              .toLowerCase()
              .includes("english"),
          );

          if (englishTranslations.length)
            setTranslationOptions(englishTranslations);
          if (englishTafsirs.length) setTafsirOptions(englishTafsirs);
        }
      } catch (resourceError) {
        console.error("Could not load resources", resourceError);
      }
    }

    loadResources();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSurah() {
      try {
        setLoading(true);
        setError("");
        stopVerseAudio();
        stopSurahPlayback();
        setSelectedVerse(null);
        setIsSidebarOpen(false);
        setAiLesson("");
        setFootnotes({});
        setTafsirData("");
        setIsFinished(false);

        const chapterRes = await fetch(
          `${API_BASE}/chapters/${surahNumber}?language=en`,
        );
        if (!chapterRes.ok) {
          throw new Error(`Failed loading chapter: ${chapterRes.status}`);
        }
        const chapterData = await chapterRes.json();
        const chapter = chapterData.chapter;

        const versesData = await fetchAllVersesByChapter(
          surahNumber,
          translationId,
          recitationId,
        );

        let fallbackTranslationMap = {};
        const translationsMissing = versesData.every(
          (verse) => !stripHtml(verse.translations?.[0]?.text || ""),
        );

        if (translationsMissing) {
          try {
            fallbackTranslationMap = await fetchTranslationMap(
              surahNumber,
              translationId,
            );
          } catch (translationMapError) {
            console.error(
              "Could not load translation fallback",
              translationMapError,
            );
          }
        }

        const bismillahVariants = [
          "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
          "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
          "بسم الله الرحمن الرحيم",
        ];

        const stripLeadingBismillah = (text = "") => {
          const trimmed = String(text).trim();
          for (const phrase of bismillahVariants) {
            if (trimmed.startsWith(phrase)) {
              return trimmed.slice(phrase.length).trim();
            }
          }
          return trimmed;
        };

        const normalizedVerses = versesData.map((verse) => {
          const verseNumber =
            verse.verse_number || extractVerseNumber(verse.verse_key);
          const verseText =
            chapter.bismillah_pre && verse.verse_key === `${surahNumber}:1`
              ? stripLeadingBismillah(verse.text_uthmani)
              : verse.text_uthmani;

          const fallbackTranslation = fallbackTranslationMap[verse.verse_key];

          return {
            ...verse,
            verse_number: verseNumber,
            text_uthmani: verseText,
            translationText:
              verse.translations?.[0]?.text || fallbackTranslation?.text || "",
            translationName:
              verse.translations?.[0]?.resource_name ||
              fallbackTranslation?.resource_name ||
              selectedTranslationLabel,
            transliterationText: verse.words
              ?.map((word) => getNestedText(word?.transliteration))
              .filter(Boolean)
              .join(" "),
          };
        });

        if (!cancelled) {
          setDisplayBismillah(Boolean(chapter.bismillah_pre));
          setSurah({
            number: chapter.id,
            revelationType: chapter.revelation_place,
            numberOfAyahs: chapter.verses_count,
            englishName: chapter.name_simple,
            englishNameTranslation: chapter.translated_name?.name || "",
            name: chapter.name_arabic,
          });
          setVerses(normalizedVerses);
          window.scrollTo(0, 0);
        }
      } catch (loadError) {
        console.error("Failed to load surah", loadError);
        if (!cancelled) {
          setError("Could not load this surah right now. Please try again.");
          setVerses([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSurah();

    return () => {
      cancelled = true;
      stopVerseAudio();
      stopSurahPlayback();
    };
  }, [surahNumber, translationId, recitationId, selectedTranslationLabel]);

  useEffect(() => {
    if (selectedVerse && isSidebarOpen) {
      loadSidebarContent(selectedVerse);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVerse?.verse_key, isSidebarOpen, translationId, tafsirId]);
  useEffect(() => {
    const openVerseKey = location.state?.openVerseKey;
    if (!openVerseKey || !verses.length) return;

    const matchedVerse = verses.find(
      (verse) => verse.verse_key === openVerseKey,
    );
    if (!matchedVerse) return;

    setSelectedVerse(matchedVerse);
    setIsSidebarOpen(true);
    setReflectionText("");
  }, [location.state?.openVerseKey, verses]);
  useEffect(() => {
    if (!selectedVerse || !location.state?.openVerseKey) return;

    navigate(location.pathname, { replace: true, state: {} });
  }, [
    selectedVerse,
    location.pathname,
    location.state?.openVerseKey,
    navigate,
  ]);

  const handleVerseClick = (verse) => {
    setSelectedVerse(verse);
    setIsSidebarOpen(true);
    setReflectionText("");
    setReflectionSaved(false);
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim() || !user || !selectedVerse) return;

    try {
      await addDoc(collection(db, "users", user.uid, "reflections"), {
        userId: user.uid,
        surahNumber: parseInt(surahNumber, 10),
        verseNumber: selectedVerse.verse_number,
        verseKey: selectedVerse.verse_key,
        translationId,
        tafsirId,
        userReflection: reflectionText.trim(),
        aiLesson,
        timestamp: serverTimestamp(),
      });

      setReflectionText("");
      setReflectionSaved(true);
    } catch (saveError) {
      console.error("Save error:", saveError);
    }
  };
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

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl p-6 shadow-md text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden">
      <div
        className={`min-w-0 flex-1 transition-all duration-300 ${isSidebarOpen ? "md:mr-96" : "mr-0"}`}
      >
        <div className="w-full max-w-4xl mx-auto px-4 py-10">
          {/* Surah Header Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate("/quran")}
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-green-300 hover:text-green-700 transition-all"
              >
                ← Back
              </button>

              <button
                onClick={handleFinishSurah}
                disabled={isFinished || finishingSurah}
                className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isFinished
                    ? "bg-green-100 text-green-700 cursor-default"
                    : finishingSurah
                      ? "bg-green-200 text-green-800 cursor-wait"
                      : "bg-green-700 text-white hover:bg-green-800"
                }`}
              >
                {isFinished
                  ? "Finished"
                  : finishingSurah
                    ? "Saving..."
                    : "Finish"}
              </button>
            </div>
            <div className="text-center">
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
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={handlePlayPauseSurah}
                className={`px-6 py-2 rounded-full font-bold transition-all ${
                  isSurahPlaying
                    ? "bg-red-100 text-red-600"
                    : "bg-green-700 text-white"
                }`}
              >
                {isSurahPlaying ? "Stop recitation" : "▶ Listen to Surah"}
              </button>

              <select
                value={translationId}
                onChange={(e) => setTranslationId(Number(e.target.value))}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {translationOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={tafsirId}
                onChange={(e) => setTafsirId(Number(e.target.value))}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {tafsirOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Settings Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6 bg-white rounded-2xl px-5 py-4 shadow-sm justify-between">
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowTranslation((prev) => !prev)}
                className={`text-sm px-4 py-1.5 rounded-xl transition-all font-medium ${
                  showTranslation
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {showTranslation ? "Translation on" : "Translation off"}
              </button>

              <button
                onClick={() => setShowTransliteration((prev) => !prev)}
                className={`text-sm px-4 py-1.5 rounded-xl transition-all font-medium ${
                  showTransliteration
                    ? "bg-sky-100 text-sky-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {showTransliteration
                  ? "Transliteration on"
                  : "Transliteration off"}
              </button>

              <button
                onClick={() => setShowWordAnalysis((prev) => !prev)}
                className={`text-sm px-4 py-1.5 rounded-xl transition-all font-medium ${
                  showWordAnalysis
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {showWordAnalysis ? "Word analysis on" : "Word analysis off"}
              </button>
            </div>
          </div>

          {displayBismillah && (
            <div className="text-center mb-8">
              <p
                className="text-3xl text-green-800"
                style={{ fontFamily: "serif" }}
              >
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
            </div>
          )}

          {/* Verses List */}
          <div className="flex flex-col gap-6">
            {verses.map((verse) => {
              const isCurrentSurahVerse = activeAyah === verse.verse_number;

              return (
                <div
                  key={verse.verse_key}
                  onClick={() => handleVerseClick(verse)}
                  className={`bg-white rounded-2xl p-6 shadow-sm transition-all cursor-pointer border-2 ${
                    isCurrentSurahVerse
                      ? "border-green-500 ring-4 ring-green-50"
                      : "border-transparent"
                  } hover:border-green-200`}
                >
                  <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold">
                        {verse.verse_number}
                      </div>

                      {isCurrentSurahVerse && (
                        <button
                          onClick={handleInlineSurahToggle}
                          className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                            isSurahPlaying
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                          title={
                            isSurahPlaying
                              ? "Pause recitation"
                              : "Resume recitation"
                          }
                        >
                          {isSurahPlaying ? "⏸" : "▶"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerseAudioToggle(verse);
                        }}
                        className={`text-xs px-3 py-1 rounded-full transition-all ${
                          playingVerseKey === verse.verse_key
                            ? "bg-green-700 text-white"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {playingVerseKey === verse.verse_key
                          ? "Pause ayah"
                          : "▶ Play ayah"}
                      </button>

                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                        <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                          Juz {verse.juz_number}
                        </span>
                        <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                          Hizb {verse.hizb_number}
                        </span>
                        <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                          Ruku {verse.ruku_number}
                        </span>
                        <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                          Manzil {verse.manzil_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p
                    className={`${fontSize} text-right text-green-900 leading-loose mb-4`}
                    dir="rtl"
                    style={{ fontFamily: "serif", lineHeight: "2.2" }}
                  >
                    {verse.text_uthmani}
                  </p>

                  {showTransliteration && verse.transliterationText && (
                    <div className="border-t border-sky-50 pt-4 mb-4">
                      <p className="text-xs uppercase tracking-wide text-sky-600 mb-2">
                        Transliteration
                      </p>
                      <p className="text-sm italic text-gray-600 leading-relaxed">
                        {verse.transliterationText}
                      </p>
                    </div>
                  )}

                  {showTranslation && (
                    <div className="text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                        {verse.translationName || selectedTranslationLabel}
                      </p>
                      <div
                        dangerouslySetInnerHTML={renderHtml(
                          verse.translationText,
                        )}
                      />
                    </div>
                  )}

                  {showWordAnalysis && verse.words?.length > 0 && (
                    <div className="mt-4 border-t border-amber-50 pt-4">
                      <p className="text-xs uppercase tracking-wide text-amber-700 mb-3">
                        Word analysis
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {verse.words.map((word, index) => {
                          const transliteration = getNestedText(
                            word.transliteration,
                          );
                          const translation = getNestedText(word.translation);
                          return (
                            <div
                              key={`${verse.verse_key}-word-${index}`}
                              className="bg-amber-50 rounded-xl px-3 py-2 min-w-[110px]"
                            >
                              <p
                                className="text-lg text-right text-amber-900"
                                dir="rtl"
                                style={{ fontFamily: "serif" }}
                              >
                                {getNestedText(word.text_uthmani)}
                              </p>
                              {!!transliteration && (
                                <p className="text-xs text-gray-600">
                                  {transliteration}
                                </p>
                              )}
                              {!!translation && (
                                <p className="text-xs text-gray-500">
                                  {translation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Optional tafsir inline display if needed */}
                  {tafsirLoading && (
                    <p className="text-sm text-gray-500 mt-4">
                      Loading tafsir...
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
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

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-gray-50 border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto z-50 ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedVerse && (
          <div className="p-6 pt-6 pb-20 sm:pb-16 flex flex-col min-h-full box-border">
            <div className="bg-gray-50 pb-4 mb-4">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="mb-4 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:text-red-500 hover:border-red-200 transition-all"
                aria-label="Close sidebar"
                title="Close"
              >
                ✕ Close
              </button>

              <h2 className="text-lg font-bold text-gray-800">
                Surah {surah.englishName} : {selectedVerse.verse_number}
              </h2>
            </div>

            <div className="mb-6">
              <p
                className="text-xl text-right text-green-900 mb-3"
                dir="rtl"
                style={{ fontFamily: "serif" }}
              >
                {selectedVerse.text_uthmani}
              </p>
              {showTransliteration && selectedVerse.transliterationText && (
                <p className="text-sm text-gray-600 italic mb-3">
                  {selectedVerse.transliterationText}
                </p>
              )}
              {showTranslation && (
                <div
                  className="text-sm text-gray-600"
                  dangerouslySetInnerHTML={renderHtml(
                    selectedVerse.translationText,
                  )}
                />
              )}
            </div>

            {sidebarLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 animate-pulse">
                  Loading lesson and footnotes...
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl border border-green-200 min-h-[120px]">
                  <h3 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    ✨ AI Reflection
                  </h3>
                  <p className="text-sm text-green-900 font-medium leading-relaxed">
                    {aiLesson}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Tafsir — {selectedTafsirLabel}
                  </h3>
                  <div className="text-sm text-gray-700 bg-white p-5 rounded-xl border border-gray-100 shadow-sm leading-relaxed max-h-64 overflow-y-auto custom-scrollbar min-h-[220px]">
                    {tafsirData}
                  </div>
                </div>

                {!!Object.keys(footnotes).length && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Footnotes
                    </h3>
                    <div className="space-y-3 min-h-[110px]">
                      {Object.entries(footnotes).map(([footnoteId, text]) => (
                        <div
                          key={footnoteId}
                          className="bg-white p-3 rounded-xl border border-gray-100 text-sm text-gray-700"
                        >
                          <p className="text-xs text-gray-400 mb-1">
                            Footnote {footnoteId}
                          </p>
                          <div
                            dangerouslySetInnerHTML={renderHtml(String(text))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    My personal reflection
                  </label>
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="How does this apply to my life right now? What can I improve?"
                    className="w-full h-40 p-4 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none shadow-inner"
                  />
                  <button
                    onClick={handleSaveReflection}
                    disabled={reflectionSaved || !reflectionText.trim()}
                    className={`w-full mt-3 text-white font-bold py-3 rounded-xl transition-all ${
                      reflectionSaved
                        ? "bg-green-500 cursor-default"
                        : "bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {reflectionSaved ? "Journal saved" : "Save to Journal"}
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
