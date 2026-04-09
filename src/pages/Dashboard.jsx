import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import DailyReconnectCard from "../components/DailyReconnectCard";

// Badge definitions — each badge has a condition to unlock it
const BADGES = [
  {
    id: "first_day",
    emoji: "🌱",
    name: "First Step",
    desc: "Log your first reading day",
    check: (stats) => stats.totalDays >= 1,
  },
  {
    id: "streak_7",
    emoji: "🔥",
    name: "Week Warrior",
    desc: "Reach a 7-day streak",
    check: (stats) => stats.longestStreak >= 7,
  },
  {
    id: "streak_30",
    emoji: "⚡",
    name: "Monthly Master",
    desc: "Reach a 30-day streak",
    check: (stats) => stats.longestStreak >= 30,
  },
  {
    id: "days_10",
    emoji: "📚",
    name: "Dedicated Reader",
    desc: "Read on 10 different days",
    check: (stats) => stats.totalDays >= 10,
  },
  {
    id: "days_50",
    emoji: "🏅",
    name: "Committed",
    desc: "Read on 50 different days",
    check: (stats) => stats.totalDays >= 50,
  },
  {
    id: "days_100",
    emoji: "💎",
    name: "Centurion",
    desc: "Read on 100 different days",
    check: (stats) => stats.totalDays >= 100,
  },
  {
    id: "fajr_reader",
    emoji: "🌅",
    name: "Fajr Reader",
    desc: "Read 5 different surahs",
    check: (stats) => stats.uniqueSurahs >= 5,
  },
  {
    id: "khatam_1",
    emoji: "👑",
    name: "Khatam",
    desc: "Complete your first full Quran",
    check: (stats) => stats.khatamCount >= 1,
  },
];

function StatCard({ value, label, emoji }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md text-center flex-1 min-w-0">
      <p className="text-3xl mb-1">{emoji}</p>
      <p className="text-3xl font-bold text-green-800">{value}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
    </div>
  );
}

function BadgeCard({ badge, unlocked }) {
  return (
    <div
      className={`rounded-2xl p-5 text-center border transition-all ${
        unlocked
          ? "bg-white border-green-200 shadow-md"
          : "bg-gray-50 border-gray-100 opacity-50"
      }`}
    >
      <p className="text-4xl mb-2">{unlocked ? badge.emoji : "🔒"}</p>
      <p
        className={`font-semibold text-sm ${unlocked ? "text-green-800" : "text-gray-400"}`}
      >
        {badge.name}
      </p>
      <p className="text-xs text-gray-400 mt-1">{badge.desc}</p>
      {unlocked && (
        <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          Unlocked
        </span>
      )}
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [topSurahs, setTopSurahs] = useState([]);
  const [khatamCount, setKhatamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      // Load streak info
      const userDoc = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDoc);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Load full reading history
      const historyRef = collection(db, "users", user.uid, "history");
      const historySnap = await getDocs(historyRef);
      const allDates = [];
      historySnap.forEach((d) => allDates.push(d.id));

      // Load surah data
      const surahRef = collection(db, "users", user.uid, "surahs");
      const surahSnap = await getDocs(surahRef);
      const surahData = [];
      surahSnap.forEach((d) => surahData.push(d.data()));
      surahData.sort((a, b) => b.count - a.count);

      // Load khatam count
      // const khatamDoc = doc(db, "users", user.uid);
      const khatamData = userSnap.exists()
        ? userSnap.data().khatamCount || 0
        : 0;

      // Calculate longest streak from history dates
      const sortedDates = [...allDates].sort();
      let longest = 0;
      let current = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          current++;
          longest = Math.max(longest, current);
        } else {
          current = 1;
        }
      }
      if (sortedDates.length === 1) longest = 1;

      // Best month — find which month had most reading days
      const monthCounts = {};
      allDates.forEach((date) => {
        const month = date.slice(0, 7); // "2025-04"
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      const bestMonth = Object.entries(monthCounts).sort(
        (a, b) => b[1] - a[1],
      )[0];
      const bestMonthLabel = bestMonth
        ? new Date(bestMonth[0] + "-01").toLocaleString("default", {
            month: "long",
            year: "numeric",
          })
        : "—";

      setStats({
        totalDays: allDates.length,
        longestStreak: longest,
        currentStreak: userData.streak || 0,
        bestMonth: bestMonthLabel,
        bestMonthCount: bestMonth ? bestMonth[1] : 0,
        uniqueSurahs: surahData.length,
        khatamCount: khatamData,
      });

      setTopSurahs(surahData.slice(0, 5));
      setKhatamCount(khatamData);
      setLoading(false);
    };

    loadDashboard();
  }, [user.uid]);

  const incrementKhatam = async () => {
    const userDoc = doc(db, "users", user.uid);
    const newCount = khatamCount + 1;
    setKhatamCount(newCount);
    setStats((prev) => ({ ...prev, khatamCount: newCount }));
    await getDoc(userDoc).then(async (snap) => {
      const existing = snap.exists() ? snap.data() : {};
      await setDoc(userDoc, { ...existing, khatamCount: newCount });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Loading your dashboard...</p>
      </div>
    );
  }

  const unlockedCount = BADGES.filter((b) => b.check(stats)).length;

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-4 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-800">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Your Quran journey at a glance
        </p>
      </div>
      <DailyReconnectCard />
      {/* Stat cards */}
      <div className="flex flex-wrap gap-4 w-full justify-center">
        <StatCard value={stats.totalDays} label="total days read" emoji="📅" />
        <StatCard
          value={stats.currentStreak}
          label="current streak"
          emoji="🔥"
        />
        <StatCard
          value={stats.longestStreak}
          label="longest streak"
          emoji="⚡"
        />
        <StatCard
          value={`${Math.round((stats.totalDays / 365) * 100)}%`}
          label="yearly consistency"
          emoji="📊"
        />
      </div>

      {/* Best month */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full text-center">
        <p className="text-gray-400 text-sm mb-1">Best reading month</p>
        <p className="text-2xl font-bold text-green-800">{stats.bestMonth}</p>
        {stats.bestMonthCount > 0 && (
          <p className="text-green-600 text-sm mt-1">
            {stats.bestMonthCount} days read that month
          </p>
        )}
      </div>

      {/* Khatam counter */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full">
        <h2 className="text-green-700 font-semibold mb-4">Khatam counter</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-5xl font-bold text-green-800">{khatamCount}</p>
            <p className="text-gray-400 text-sm mt-1">
              {khatamCount === 1
                ? "full Quran completed"
                : "full Qurans completed"}
            </p>
          </div>
          <button
            onClick={incrementKhatam}
            className="bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 px-6 font-medium transition-colors"
          >
            + Log khatam
          </button>
        </div>
      </div>

      {/* Most read surahs */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full">
        <h2 className="text-green-700 font-semibold mb-4">Most read surahs</h2>
        {topSurahs.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No surah data yet. Select a surah when logging your reading on the
            Home page.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {topSurahs.map((surah, index) => {
              const maxCount = topSurahs[0].count;
              const percentage = Math.round((surah.count / maxCount) * 100);
              return (
                <div key={surah.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">
                      {index + 1}. {surah.name}
                    </span>
                    <span className="text-green-600">{surah.count}x</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-green-700 font-semibold">Achievements</h2>
          <span className="text-sm text-gray-400">
            {unlockedCount} / {BADGES.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGES.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              unlocked={badge.check(stats)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
