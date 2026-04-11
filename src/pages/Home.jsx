import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import StreakTracker from "../StreakTracker";
import { useNavigate } from "react-router-dom";
import DailyReconnectCard from "../components/DailyReconnectCard";
import DailyQuizCard from "../components/DailyQuizCard";
import QuranFoundationConnectCard from "../components/QuranFoundationConnectCard";

const getNestedText = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.name === "string") return value.name;
  if (typeof value.translation === "string") return value.translation;
  return "";
};

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function fetchVerseTranslation(
  chapterNumber,
  verseNumber,
  translationId = 131,
) {
  const res = await fetch(
    `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}`,
  );
  if (!res.ok) {
    throw new Error(`Failed loading translation map: ${res.status}`);
  }

  const data = await res.json();
  const verseKey = `${chapterNumber}:${verseNumber}`;
  const match = (data.translations || []).find(
    (item) => item.verse_key === verseKey,
  );
  return stripHtml(match?.text || "");
}

function Home() {
  const { user } = useAuth();
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wordItems, setWordItems] = useState([]);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const CACHE_KEY = "home_verse_of_the_day_v4";
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    const surahVerseCounts = {
      1: 7,
      2: 286,
      3: 200,
      4: 176,
      5: 120,
      6: 165,
      7: 206,
      8: 75,
      9: 129,
      10: 109,
      11: 123,
      12: 111,
      13: 43,
      14: 52,
      15: 99,
      16: 128,
      17: 111,
      18: 110,
      19: 98,
      20: 135,
      21: 112,
      22: 78,
      23: 118,
      24: 64,
      25: 77,
      26: 227,
      27: 93,
      28: 88,
      29: 69,
      30: 60,
      31: 34,
      32: 30,
      33: 73,
      34: 54,
      35: 45,
      36: 83,
      37: 182,
      38: 88,
      39: 75,
      40: 85,
      41: 54,
      42: 53,
      43: 89,
      44: 59,
      45: 37,
      46: 35,
      47: 38,
      48: 29,
      49: 18,
      50: 45,
      51: 60,
      52: 49,
      53: 62,
      54: 55,
      55: 78,
      56: 96,
      57: 29,
      58: 22,
      59: 24,
      60: 13,
      61: 14,
      62: 11,
      63: 11,
      64: 18,
      65: 12,
      66: 12,
      67: 30,
      68: 52,
      69: 52,
      70: 44,
      71: 28,
      72: 28,
      73: 20,
      74: 56,
      75: 40,
      76: 31,
      77: 50,
      78: 40,
      79: 46,
      80: 42,
      81: 29,
      82: 19,
      83: 36,
      84: 25,
      85: 22,
      86: 17,
      87: 19,
      88: 26,
      89: 30,
      90: 20,
      91: 15,
      92: 21,
      93: 11,
      94: 8,
      95: 8,
      96: 19,
      97: 5,
      98: 8,
      99: 8,
      100: 11,
      101: 11,
      102: 8,
      103: 3,
      104: 9,
      105: 5,
      106: 4,
      107: 7,
      108: 3,
      109: 6,
      110: 3,
      111: 5,
      112: 4,
      113: 5,
      114: 6,
    };

    const getRandomVerseRef = () => {
      const surahNumber = Math.floor(Math.random() * 114) + 1;
      const verseCount = surahVerseCounts[surahNumber];
      const verseNumber = Math.floor(Math.random() * verseCount) + 1;
      return { surahNumber, verseNumber };
    };

    const normalizeWords = (words = []) =>
      words.map((word) => ({
        arabic: word.text_uthmani || "",
        transliteration: getNestedText(word?.transliteration),
        translation: getNestedText(word?.translation),
      }));

    const loadVerse = async () => {
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);

        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Date.now() - cached.savedAt < SIX_HOURS) {
            setVerse(cached.verse);
            setWordItems(cached.wordItems || []);
            setLoading(false);
            return;
          }
        }

        const { surahNumber, verseNumber } = getRandomVerseRef();

        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${surahNumber}:${verseNumber}?language=en&translations=131&fields=text_uthmani,verse_key,juz_number,hizb_number,page_number&translation_fields=resource_name,text&word_fields=text_uthmani,translation,transliteration&words=true`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load verse: ${res.status}`);
        }

        const data = await res.json();
        const verseData = data?.verse;

        if (!verseData) {
          throw new Error("Verse data malformed");
        }

        let fullTranslation = stripHtml(
          verseData.translations?.[0]?.text || "",
        );

        if (!fullTranslation) {
          try {
            fullTranslation = await fetchVerseTranslation(
              surahNumber,
              verseNumber,
              131,
            );
          } catch (translationError) {
            console.error(
              "Fallback translation fetch failed:",
              translationError,
            );
          }
        }

        const normalizedVerse = {
          arabic: verseData.text_uthmani || "",
          translation: fullTranslation,
          surahName: verseData.chapter?.name_simple || `Surah ${surahNumber}`,
          surahNumber,
          verseNumber,
        };

        const normalizedWords = normalizeWords(verseData.words || []);

        setVerse(normalizedVerse);
        setWordItems(normalizedWords);

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            verse: normalizedVerse,
            wordItems: normalizedWords,
          }),
        );
      } catch (error) {
        console.error("Failed to load verse of the day:", error);
        setVerse(null);
        setWordItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadVerse();
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4 max-w-7xl mx-auto">
      <div className="w-full flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-green-800">
            Assalamu Alaikum, {user?.displayName || "Friend"}
          </h1>
          <p className="text-gray-500 font-medium text-sm">
            Welcome back to your Quran journey.
          </p>
        </div>

        <div className="shrink-0 md:ml-6 md:self-start">
          <QuranFoundationConnectCard />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full items-stretch">
        <div className="xl:col-span-5 flex">
          <div className="w-full flex">
            <StreakTracker userId={user.uid} />
          </div>
        </div>

        <div className="xl:col-span-7 flex">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md w-full flex flex-col justify-between border border-transparent">
            <div>
              <h2 className="text-green-700 text-lg font-semibold mb-4">
                Verse of the day
              </h2>

              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={() => setShowTranslation((prev) => !prev)}
                  className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium ${
                    showTranslation
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {showTranslation ? "Translation on" : "Translation off"}
                </button>

                <button
                  onClick={() => setShowTransliteration((prev) => !prev)}
                  className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium ${
                    showTransliteration
                      ? "bg-sky-100 text-sky-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {showTransliteration
                    ? "Transliteration on"
                    : "Transliteration off"}
                </button>
              </div>

              {loading ? (
                <p className="text-gray-400 text-center py-10">
                  Loading verse...
                </p>
              ) : verse ? (
                <>
                  <p
                    className="text-3xl md:text-4xl text-right text-green-900 leading-loose mb-6"
                    dir="rtl"
                    style={{ fontFamily: "serif", lineHeight: "2.2" }}
                  >
                    {verse.arabic}
                  </p>

                  {showTransliteration && wordItems.length > 0 && (
                    <div className="border-t border-sky-50 pt-4 mb-4">
                      <p className="text-xs uppercase tracking-wide text-sky-600 mb-2">
                        Transliteration
                      </p>
                      <p className="text-sm italic text-gray-600 leading-relaxed">
                        {wordItems
                          .map((word) => word.transliteration)
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    </div>
                  )}

                  {showTranslation && verse.translation && (
                    <p className="text-gray-600 text-lg italic mb-3">
                      "{verse.translation}"
                    </p>
                  )}

                  <p className="text-md text-green-600 font-medium mb-5">
                    — Surah {verse.surahName}, Verse {verse.verseNumber}
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-center">
                  Could not load verse.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                onClick={() => navigate(`/quran/${verse?.surahNumber}`)}
                className="text-sm text-green-600 hover:text-green-800 font-medium transition-colors text-left"
              >
                Read full Surah {verse?.surahName} →
              </button>

              <button
                onClick={() =>
                  navigate(`/quran/${verse?.surahNumber}`, {
                    state: {
                      openVerseKey: `${verse?.surahNumber}:${verse?.verseNumber}`,
                    },
                  })
                }
                className="text-sm text-green-700 hover:text-green-900 font-semibold transition-colors text-left sm:text-right"
              >
                Reflect on this verse →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <DailyReconnectCard />
      </div>

      <div className="w-full">
        <DailyQuizCard />
      </div>
    </div>
  );
}

export default Home;
