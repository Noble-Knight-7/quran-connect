import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import StreakTracker from "../StreakTracker";
import { useNavigate } from "react-router-dom";
import DailyReconnectCard from "../components/DailyReconnectCard";
import DailyQuizCard from "../components/DailyQuizCard";
import QuranFoundationConnectCard from "../components/QuranFoundationConnectCard";
import { useQuranFoundation } from "../context/QuranFoundationContext";

const getNestedText = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.name === "string") return value.name;
  if (typeof value.translation === "string") return value.translation;
  return "";
};

function Home() {
  const { user } = useAuth();
  const { connected, latestReadingSession } = useQuranFoundation();
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wordItems, setWordItems] = useState([]);
  const [continueReadingSurahName, setContinueReadingSurahName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const CACHE_KEY = "home_verse_of_the_day_v5";
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
          `https://api.quran.com/api/v4/verses/by_key/${surahNumber}:${verseNumber}?language=en&fields=text_uthmani,verse_key,juz_number,hizb_number,page_number&word_fields=text_uthmani,transliteration&words=true`,
        );
        if (!res.ok) throw new Error(`Failed to load verse: ${res.status}`);
        const data = await res.json();
        const verseData = data?.verse;
        const normalizedVerse = {
          arabic: verseData.text_uthmani || "",
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
        console.error("Failed to load verse:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVerse();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadContinueReadingMeta() {
      if (!connected || !latestReadingSession?.chapterNumber) {
        setContinueReadingSurahName("");
        return;
      }
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/chapters/${latestReadingSession.chapterNumber}?language=en`,
        );
        const data = await res.json();
        if (!cancelled)
          setContinueReadingSurahName(
            data?.chapter?.name_simple ||
              `Surah ${latestReadingSession.chapterNumber}`,
          );
      } catch (error) {
        if (!cancelled)
          setContinueReadingSurahName(
            `Surah ${latestReadingSession.chapterNumber}`,
          );
      }
    }
    loadContinueReadingMeta();
    return () => {
      cancelled = true;
    };
    // Added latestReadingSession here to trigger re-fetch on home page when spot changes
  }, [connected, latestReadingSession]);

  return (
    <div className="flex flex-col items-center gap-5 sm:gap-6 py-6 sm:py-8 md:py-10 px-4 sm:px-5 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="w-full flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="text-left min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl font-bold text-green-800 leading-tight break-words">
              Assalamu Alaikum, {user?.displayName || "Friend"}
            </h1>
            <p className="text-gray-500 font-medium text-sm sm:text-base mt-1">
              Welcome back to your Quran journey.
            </p>
          </div>
          <div className="w-full md:w-auto md:max-w-[360px] shrink-0">
            <QuranFoundationConnectCard />
          </div>
        </div>
      </div>

      {/* 1. Continue Reading or Empty State */}
      {connected && latestReadingSession?.chapterNumber ? (
        <div className="bg-white rounded-2xl px-5 py-4 shadow-md border border-green-100 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600 mb-1">
                Continue reading
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-green-900">
                {continueReadingSurahName}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Resume from Ayah {latestReadingSession.verseNumber || 1}
              </p>
            </div>
            <button
              onClick={() =>
                navigate(`/quran/${latestReadingSession.chapterNumber}`, {
                  state: {
                    resumeVerseKey: `${latestReadingSession.chapterNumber}:${latestReadingSession.verseNumber}`,
                  },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-bold transition-colors shadow-sm"
            >
              Resume now
            </button>
          </div>
        </div>
      ) : (
        // <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-green-50 w-full relative overflow-hidden group transition-all hover:shadow-lg">
        <div className="bg-white rounded-2xl px-5 py-4 shadow-md border border-green-100 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-600 mb-1">
                Continue reading
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-green-900">
                Begin your Quran journey
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Start from Surah Al-Fatiha
              </p>
            </div>

            <button
              onClick={() => navigate("/quran/1")}
              className="px-5 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              Start now
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 w-full items-stretch">
        <div className="order-1 xl:col-span-5 flex">
          <div className="w-full h-full shadow-md rounded-2xl overflow-hidden">
            {user?.uid ? (
              <StreakTracker userId={user.uid} />
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 w-full h-full min-h-[560px] animate-pulse flex items-center justify-center">
                <div className="text-gray-300">Loading profile...</div>
              </div>
            )}
          </div>
        </div>

        <div className="order-2 xl:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 shadow-md w-full flex flex-col justify-between border border-transparent h-full min-h-[520px]">
            <div>
              <h2 className="text-green-700 text-base sm:text-lg font-semibold mb-4">
                Verse of the day
              </h2>
              {loading ? (
                <p className="text-gray-400 text-center py-10">Loading...</p>
              ) : (
                verse && (
                  <>
                    <p
                      className="text-[1.8rem] sm:text-[2.2rem] lg:text-[2.5rem] text-right text-green-900 leading-[2] mb-5"
                      dir="rtl"
                      style={{ fontFamily: "serif" }}
                    >
                      {verse.arabic}
                    </p>
                    {wordItems.length > 0 && (
                      <div className="border-t border-sky-50 pt-4 mb-4">
                        <p className="text-xs uppercase tracking-wide text-sky-600 mb-2">
                          Transliteration
                        </p>
                        <p className="text-sm italic text-gray-600 leading-relaxed">
                          {wordItems
                            .map((w) => w.transliteration)
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      </div>
                    )}
                    <p className="text-sm sm:text-md text-green-600 font-medium">
                      — {verse.surahName}, Verse {verse.verseNumber}
                    </p>
                  </>
                )
              )}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                onClick={() => navigate(`/quran/${verse?.surahNumber}`)}
                className="text-sm text-green-600 hover:text-green-800 font-medium text-left"
              >
                Read full Surah →
              </button>
              <button
                onClick={() =>
                  navigate(`/quran/${verse?.surahNumber}`, {
                    state: {
                      openVerseKey: `${verse?.surahNumber}:${verse?.verseNumber}`,
                    },
                  })
                }
                className="text-sm text-green-700 hover:text-green-900 font-semibold text-left sm:text-right"
              >
                Reflect on this verse →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col gap-4">
        <DailyReconnectCard />
        <DailyQuizCard />
      </div>
    </div>
  );
}

export default Home;
