import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDayDiff, getLocalDateKey } from "./utils/date";

const SURAHS = [
  "Al-Fatiha",
  "Al-Baqarah",
  "Al-Imran",
  "An-Nisa",
  "Al-Maidah",
  "Al-Anam",
  "Al-Araf",
  "Al-Anfal",
  "At-Tawbah",
  "Yunus",
  "Hud",
  "Yusuf",
  "Ar-Rad",
  "Ibrahim",
  "Al-Hijr",
  "An-Nahl",
  "Al-Isra",
  "Al-Kahf",
  "Maryam",
  "Ta-Ha",
  "Al-Anbiya",
  "Al-Hajj",
  "Al-Muminun",
  "An-Nur",
  "Al-Furqan",
  "Ash-Shuara",
  "An-Naml",
  "Al-Qasas",
  "Al-Ankabut",
  "Ar-Rum",
  "Luqman",
  "As-Sajdah",
  "Al-Ahzab",
  "Saba",
  "Fatir",
  "Ya-Sin",
  "As-Saffat",
  "Sad",
  "Az-Zumar",
  "Ghafir",
  "Fussilat",
  "Ash-Shura",
  "Az-Zukhruf",
  "Ad-Dukhan",
  "Al-Jathiyah",
  "Al-Ahqaf",
  "Muhammad",
  "Al-Fath",
  "Al-Hujurat",
  "Qaf",
  "Adh-Dhariyat",
  "At-Tur",
  "An-Najm",
  "Al-Qamar",
  "Ar-Rahman",
  "Al-Waqiah",
  "Al-Hadid",
  "Al-Mujadilah",
  "Al-Hashr",
  "Al-Mumtahanah",
  "As-Saf",
  "Al-Jumuah",
  "Al-Munafiqun",
  "At-Taghabun",
  "At-Talaq",
  "At-Tahrim",
  "Al-Mulk",
  "Al-Qalam",
  "Al-Haqqah",
  "Al-Maarij",
  "Nuh",
  "Al-Jinn",
  "Al-Muzzammil",
  "Al-Muddaththir",
  "Al-Qiyamah",
  "Al-Insan",
  "Al-Mursalat",
  "An-Naba",
  "An-Naziat",
  "Abasa",
  "At-Takwir",
  "Al-Infitar",
  "Al-Mutaffifin",
  "Al-Inshiqaq",
  "Al-Buruj",
  "At-Tariq",
  "Al-Ala",
  "Al-Ghashiyah",
  "Al-Fajr",
  "Al-Balad",
  "Ash-Shams",
  "Al-Layl",
  "Ad-Duha",
  "Ash-Sharh",
  "At-Tin",
  "Al-Alaq",
  "Al-Qadr",
  "Al-Bayyinah",
  "Az-Zalzalah",
  "Al-Adiyat",
  "Al-Qariah",
  "At-Takathur",
  "Al-Asr",
  "Al-Humazah",
  "Al-Fil",
  "Quraysh",
  "Al-Maun",
  "Al-Kawthar",
  "Al-Kafirun",
  "An-Nasr",
  "Al-Masad",
  "Al-Ikhlas",
  "Al-Falaq",
  "An-Nas",
];

function StreakTracker({ userId }) {
  const [streak, setStreak] = useState(0);
  const [lastReadDate, setLastReadDate] = useState(null);
  const [readToday, setReadToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurahs, setSelectedSurahs] = useState([]);
  const [todaySurahs, setTodaySurahs] = useState([]);

  useEffect(() => {
    const loadStreak = async () => {
      const today = getLocalDateKey();
      const userDoc = doc(db, "users", userId);
      const historyDoc = doc(db, "users", userId, "history", today);

      const [userSnap, historySnap] = await Promise.all([
        getDoc(userDoc),
        getDoc(historyDoc),
      ]);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setStreak(data.streak || 0);
        setLastReadDate(data.lastReadDate || null);
        if (data.lastReadDate === today) setReadToday(true);
      }

      if (historySnap.exists()) {
        const historyData = historySnap.data();
        const existingSurahs = Array.isArray(historyData.surahsCompleted)
          ? historyData.surahsCompleted
          : historyData.surah
            ? [historyData.surah]
            : [];
        setTodaySurahs(existingSurahs);
      }

      setLoading(false);
    };

    loadStreak();
  }, [userId]);

  const filteredSurahs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const pool = SURAHS.filter((surah) => !selectedSurahs.includes(surah));

    if (!term) return pool.slice(0, 12);

    return pool
      .filter((surah) => surah.toLowerCase().includes(term))
      .slice(0, 12);
  }, [searchTerm, selectedSurahs]);

  const addSurah = (surah) => {
    if (selectedSurahs.includes(surah)) return;
    setSelectedSurahs((prev) => [...prev, surah]);
    setSearchTerm("");
  };

  const removeSelectedSurah = (surah) => {
    setSelectedSurahs((prev) => prev.filter((item) => item !== surah));
  };

  const handleReadToday = async () => {
    const today = getLocalDateKey();
    if (!selectedSurahs.length || saving) return;

    setSaving(true);

    try {
      const userDoc = doc(db, "users", userId);
      const historyDoc = doc(db, "users", userId, "history", today);

      const [userSnap, historySnap] = await Promise.all([
        getDoc(userDoc),
        getDoc(historyDoc),
      ]);

      const userData = userSnap.exists() ? userSnap.data() : {};
      const currentStreak = Number(userData.streak || 0);
      const currentLastReadDate = userData.lastReadDate || null;
      const currentTotalDays = Number(userData.totalDays || 0);

      const existingHistory = historySnap.exists() ? historySnap.data() : {};
      const existingSurahs = Array.isArray(existingHistory.surahsCompleted)
        ? existingHistory.surahsCompleted
        : existingHistory.surah
          ? [existingHistory.surah]
          : [];

      const newUniqueSurahs = selectedSurahs.filter(
        (surah) => !existingSurahs.includes(surah),
      );

      if (!newUniqueSurahs.length) {
        setSelectedSurahs([]);
        setSaving(false);
        return;
      }

      const diff = getDayDiff(currentLastReadDate, today);

      let newStreak = currentStreak;

      if (currentLastReadDate === today) {
        newStreak = currentStreak || 1;
      } else if (diff === 1) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }

      const mergedSurahs = [
        ...new Set([...existingSurahs, ...newUniqueSurahs]),
      ];
      const previousCount = Number(existingHistory.count || 0);
      const addedCount = newUniqueSurahs.length;

      const isFirstLogForThisDate = !historySnap.exists();
      const nextTotalDays = isFirstLogForThisDate
        ? currentTotalDays + 1
        : currentTotalDays;

      await setDoc(
        userDoc,
        {
          streak: newStreak,
          lastReadDate: today,
          totalDays: nextTotalDays,
        },
        { merge: true },
      );

      await setDoc(
        historyDoc,
        {
          date: today,
          read: true,
          count: previousCount + addedCount,
          surahsCompleted: mergedSurahs,
          lastUpdatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      for (const surah of newUniqueSurahs) {
        const surahDoc = doc(db, "users", userId, "surahs", surah);
        const surahSnap = await getDoc(surahDoc);
        const currentCount = surahSnap.exists()
          ? surahSnap.data().count || 0
          : 0;

        await setDoc(
          surahDoc,
          { count: currentCount + 1, name: surah },
          { merge: true },
        );
      }

      setStreak(newStreak);
      setLastReadDate(today);
      setReadToday(true);
      setTodaySurahs(mergedSurahs);
      setSelectedSurahs([]);
    } finally {
      setSaving(false);
    }
  };

  const todayStr = getLocalDateKey();
  const diff = getDayDiff(lastReadDate, todayStr);
  const isAtRisk = diff === 1 && streak > 0 && !readToday;

  const getMotivation = () => {
    if (isAtRisk) {
      return {
        emoji: "⚠️",
        message: "Streak at risk! Read today to keep it alive.",
        color: "text-orange-600",
      };
    }
    if (streak === 0) {
      return {
        emoji: "📖",
        message: "Start your journey today",
        color: "text-green-600",
      };
    }
    if (streak < 3) {
      return {
        emoji: "🌱",
        message: "Great start! Keep going",
        color: "text-green-600",
      };
    }
    if (streak < 7) {
      return {
        emoji: "🔥",
        message: "You're building a habit!",
        color: "text-green-600",
      };
    }
    if (streak < 30) {
      return {
        emoji: "⚡",
        message: "MashaAllah! Stay consistent",
        color: "text-green-600",
      };
    }
    return {
      emoji: "👑",
      message: "SubhanAllah! You're unstoppable",
      color: "text-green-600",
    };
  };

  const { emoji, message, color } = getMotivation();

  if (loading) {
    return (
      <div className="rounded-2xl p-5 sm:p-6 md:p-8 shadow-md w-full border bg-white border-gray-100 min-h-[560px] sm:min-h-[620px] xl:h-[740px] flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading your streak...</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 md:p-8 shadow-md w-full border transition-all flex flex-col min-h-[560px] sm:min-h-[620px] xl:h-[740px] ${
        isAtRisk ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"
      }`}
    >
      <div className="text-center shrink-0">
        <p className="text-6xl mb-3">{emoji}</p>
        <p
          className={`text-5xl font-black mb-1 ${
            isAtRisk ? "text-orange-600" : "text-green-800"
          }`}
        >
          {streak}
        </p>
        <p className="text-gray-400 text-sm mb-1">
          {streak === 1 ? "day streak" : "days streak"}
        </p>
        <p className={`text-sm font-semibold mb-6 ${color}`}>{message}</p>
      </div>

      <div className="rounded-2xl bg-green-50/70 border border-green-100 p-4 mb-4 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-green-700">
            Today’s surahs
          </p>
          <span className="text-[10px] font-bold text-green-700 bg-white px-2.5 py-1 rounded-full border border-green-100">
            {todaySurahs.length} logged
          </span>
        </div>

        {todaySurahs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {todaySurahs.map((surah) => (
              <span
                key={surah}
                className="px-3 py-1.5 rounded-full bg-white border border-green-100 text-xs font-semibold text-green-800"
              >
                {surah}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nothing logged yet for today.</p>
        )}
      </div>

      <div className="mb-4 shrink-0">
        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">
          Search and add surahs
        </label>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search surah name..."
          className="w-full border border-gray-200 rounded-2xl py-3 px-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
        />
      </div>

      {selectedSurahs.length > 0 && (
        <div className="mb-4 shrink-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">
            Ready to log
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSurahs.map((surah) => (
              <button
                key={surah}
                type="button"
                onClick={() => removeSelectedSurah(surah)}
                className="px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold hover:bg-green-200 transition-all"
              >
                {surah} ×
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-[260px] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/70 p-2 mb-4">
        {filteredSurahs.length > 0 ? (
          <div className="space-y-1">
            {filteredSurahs.map((surah) => (
              <button
                key={surah}
                type="button"
                onClick={() => addSurah(surah)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:text-green-800 transition-all"
              >
                {surah}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 px-3 py-4">No surahs found.</p>
        )}
      </div>

      <button
        onClick={handleReadToday}
        disabled={!selectedSurahs.length || saving}
        className={`w-full rounded-2xl py-3.5 px-6 font-bold text-sm transition-all shadow-sm shrink-0 ${
          isAtRisk
            ? "bg-orange-500 hover:bg-orange-600 text-white"
            : "bg-green-700 hover:bg-green-800 text-white"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {saving
          ? "Saving..."
          : readToday
            ? `Add ${selectedSurahs.length || ""} more surah${selectedSurahs.length === 1 ? "" : "s"}`
            : "Log today’s reading"}
      </button>

      {lastReadDate && (
        <p
          className={`text-xs mt-4 text-center shrink-0 ${
            isAtRisk ? "text-orange-400" : "text-gray-300"
          }`}
        >
          Last read: {lastReadDate}
        </p>
      )}
    </div>
  );
}

export default StreakTracker;
