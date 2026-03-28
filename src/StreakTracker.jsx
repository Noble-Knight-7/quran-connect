import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

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
  const [selectedSurah, setSelectedSurah] = useState("Al-Fatiha");
  const [showSurahPicker, setShowSurahPicker] = useState(false);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    const loadStreak = async () => {
      const userDoc = doc(db, "users", userId);
      const snapshot = await getDoc(userDoc);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setStreak(data.streak || 0);
        setLastReadDate(data.lastReadDate || null);
        if (data.lastReadDate === getTodayString()) setReadToday(true);
      }
      setLoading(false);
    };
    loadStreak();
  }, [userId]);

  const handleReadToday = async () => {
    const today = getTodayString();
    if (lastReadDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];
    const newStreak = lastReadDate === yesterdayString ? streak + 1 : 1;

    setStreak(newStreak);
    setLastReadDate(today);
    setReadToday(true);
    setShowSurahPicker(false);

    // Save streak
    const userDoc = doc(db, "users", userId);
    await setDoc(userDoc, { streak: newStreak, lastReadDate: today });

    // Save to history with surah info
    const historyDoc = doc(db, "users", userId, "history", today);
    await setDoc(historyDoc, {
      date: today,
      read: true,
      surah: selectedSurah,
    });

    // Update surah count — how many times this surah was read
    const surahDoc = doc(db, "users", userId, "surahs", selectedSurah);
    const surahSnap = await getDoc(surahDoc);
    const currentCount = surahSnap.exists() ? surahSnap.data().count : 0;
    await setDoc(surahDoc, { count: currentCount + 1, name: selectedSurah });
  };

  const getMotivation = () => {
    if (streak === 0)
      return { emoji: "📖", message: "Start your journey today" };
    if (streak < 3) return { emoji: "🌱", message: "Great start! Keep going" };
    if (streak < 7) return { emoji: "🔥", message: "You're building a habit!" };
    if (streak < 30)
      return { emoji: "⚡", message: "MashaAllah! Stay consistent" };
    return { emoji: "👑", message: "SubhanAllah! You're unstoppable" };
  };

  const { emoji, message } = getMotivation();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-md w-full max-w-sm text-center">
        <p className="text-gray-400">Loading your streak...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-md w-full max-w-sm text-center">
      <p className="text-6xl mb-3">{emoji}</p>
      <p className="text-5xl font-bold text-green-800 mb-1">{streak}</p>
      <p className="text-gray-400 text-sm mb-1">
        {streak === 1 ? "day streak" : "days streak"}
      </p>
      <p className="text-green-600 text-sm font-medium mb-6">{message}</p>

      {readToday ? (
        <div className="bg-green-100 text-green-700 rounded-xl py-3 px-6 font-medium">
          Logged for today ✓
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Surah selector */}
          <select
            value={selectedSurah}
            onChange={(e) => setSelectedSurah(e.target.value)}
            className="w-full border border-gray-200 rounded-xl py-2 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            {SURAHS.map((surah) => (
              <option key={surah} value={surah}>
                {surah}
              </option>
            ))}
          </select>

          <button
            onClick={handleReadToday}
            className="bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 px-6 font-medium w-full transition-colors"
          >
            I read today
          </button>
        </div>
      )}

      {lastReadDate && (
        <p className="text-gray-300 text-xs mt-4">Last read: {lastReadDate}</p>
      )}
    </div>
  );
}

export default StreakTracker;
