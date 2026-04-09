import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

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

function StatCard({ value, label, emoji, color = "green" }) {
  const colorMap = {
    blue: "bg-blue-50",
    orange: "bg-orange-50",
    yellow: "bg-yellow-50",
    green: "bg-green-50",
  };
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
      <div
        className={`w-12 h-12 rounded-xl ${colorMap[color]} flex items-center justify-center text-2xl mb-3`}
      >
        {emoji}
      </div>
      <p className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
        {value}
      </p>
      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1 text-center">
        {label}
      </p>
    </div>
  );
}

function BadgeCard({ badge, unlocked }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 text-center border transition-all duration-500 ${
        unlocked
          ? "bg-white border-green-200 shadow-md scale-100"
          : "bg-gray-50/50 border-gray-100 opacity-60 grayscale scale-95"
      }`}
    >
      <div className="text-3xl mb-2 drop-shadow-sm">
        {unlocked ? badge.emoji : "🔒"}
      </div>
      <p
        className={`font-bold text-xs ${unlocked ? "text-green-900" : "text-gray-400"}`}
      >
        {badge.name}
      </p>
      <p className="text-[9px] text-gray-400 mt-1 leading-tight">
        {badge.desc}
      </p>
      {unlocked && (
        <div className="absolute top-0 right-0 p-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
function formatReflectionDate(timestamp) {
  if (!timestamp?.toDate) return "Recently";
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [topSurahs, setTopSurahs] = useState([]);
  const [khatamCount, setKhatamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reflections, setReflections] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      const userDoc = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDoc);
      const userData = userSnap.exists() ? userSnap.data() : {};

      const historyRef = collection(db, "users", user.uid, "history");
      const historySnap = await getDocs(historyRef);
      const allDates = [];
      historySnap.forEach((d) => allDates.push(d.id));

      const surahRef = collection(db, "users", user.uid, "surahs");
      const surahSnap = await getDocs(surahRef);
      const surahData = [];
      surahSnap.forEach((d) => surahData.push(d.data()));
      surahData.sort((a, b) => b.count - a.count);

      const khatamData = userData.khatamCount || 0;
      const reflectionsRef = query(
        collection(db, "users", user.uid, "reflections"),
        orderBy("timestamp", "desc"),
        limit(6),
      );
      const reflectionsSnap = await getDocs(reflectionsRef);
      const reflectionData = [];
      reflectionsSnap.forEach((d) => {
        reflectionData.push({ id: d.id, ...d.data() });
      });
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

      const monthCounts = {};
      allDates.forEach((date) => {
        const month = date.slice(0, 7);
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
      setReflections(reflectionData);
      setLoading(false);
    };
    loadDashboard();
  }, [user.uid]);

  const incrementKhatam = async () => {
    const userDoc = doc(db, "users", user.uid);
    const newCount = khatamCount + 1;
    setKhatamCount(newCount);
    setStats((prev) => ({ ...prev, khatamCount: newCount }));
    const snap = await getDoc(userDoc);
    const existing = snap.exists() ? snap.data() : {};
    await setDoc(
      userDoc,
      { ...existing, khatamCount: newCount },
      { merge: true },
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 font-medium">
        Loading Statistics...
      </div>
    );

  const unlockedCount = BADGES.filter((b) => b.check(stats)).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-32 md:pb-10">
      {" "}
      {/* Extra bottom padding for mobile nav */}
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-green-900 tracking-tight">
          Your Journey
        </h1>
        <p className="text-gray-500 font-medium text-sm">
          Insights and milestones from your Quran connection.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Main Stats) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top 4 Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              value={stats.totalDays}
              label="Total Days"
              emoji="📅"
              color="blue"
            />
            <StatCard
              value={stats.currentStreak}
              label="Streak"
              emoji="🔥"
              color="orange"
            />
            <StatCard
              value={stats.longestStreak}
              label="Best"
              emoji="⚡"
              color="yellow"
            />
            <StatCard
              value={`${Math.round((stats.totalDays / 365) * 100)}%`}
              label="Consistency"
              emoji="📊"
              color="green"
            />
          </div>
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">
                  My Reflections
                </h2>
                <p className="text-gray-400 text-xs font-medium mt-1">
                  Your recent personal journal entries from the Quran.
                </p>
              </div>
              <div className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                {reflections.length} saved
              </div>
            </div>

            {reflections.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-5 py-10 text-center">
                <p className="text-gray-500 font-medium">
                  No reflections saved yet.
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Save a reflection from any ayah and it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reflections.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-green-50/40 p-4 md:p-5 shadow-sm hover:border-green-200 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-green-700 text-[10px] font-black uppercase tracking-widest mb-1">
                          Surah {item.surahNumber} • Ayah {item.verseNumber}
                        </p>
                        <p className="text-gray-400 text-xs font-medium">
                          {formatReflectionDate(item.timestamp)}
                        </p>
                      </div>
                      <div className="self-start px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                        Journal
                      </div>
                    </div>

                    <p className="text-gray-800 text-sm md:text-[15px] leading-7 font-medium whitespace-pre-line">
                      {item.userReflection}
                    </p>

                    {item.aiLesson && (
                      <div className="mt-4 rounded-xl bg-green-50 border border-green-100 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-1">
                          Reflection Prompt
                        </p>
                        <p className="text-sm text-green-900 leading-6">
                          {item.aiLesson}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Focus Surahs Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-gray-800 tracking-tight">
                Focus Surahs
              </h2>
              <div className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                Top 5
              </div>
            </div>
            {topSurahs.length === 0 ? (
              <p className="text-gray-400 text-center py-10 italic">
                No activity logged yet.
              </p>
            ) : (
              <div className="space-y-6">
                {topSurahs.map((surah, index) => {
                  const maxCount = topSurahs[0].count;
                  const percentage = Math.round((surah.count / maxCount) * 100);
                  return (
                    <div key={surah.name} className="group">
                      <div className="flex justify-between items-end text-sm mb-2">
                        <span className="text-gray-800 font-bold text-lg leading-none">
                          {surah.name}
                        </span>
                        <span className="text-green-600 font-black text-xs">
                          {surah.count} times
                        </span>
                      </div>
                      <div className="w-full bg-gray-50 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-1000 group-hover:brightness-110"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Peak Momentum Card (Desktop Layout Filler) */}
          <div className="hidden lg:block bg-blue-50/50 border border-blue-100 rounded-3xl p-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">
                  Peak Momentum
                </p>
                <p className="text-blue-900 font-black text-3xl">
                  {stats.bestMonth}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-700 text-lg font-bold">
                  {stats.bestMonthCount} days
                </p>
                <p className="text-blue-500 text-[10px] uppercase font-bold">
                  of connection
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Achievements & Rewards) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Khatam Milestone */}
          <div className="bg-gradient-to-br from-green-800 to-green-950 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-green-300 text-[10px] font-black uppercase tracking-widest mb-2">
                Milestone
              </p>
              <h2 className="text-2xl font-black mb-6">Khatam Journey</h2>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-6xl font-black leading-none">
                  {khatamCount}
                </span>
                <span className="text-green-300 font-bold">Total</span>
              </div>
              <button
                onClick={incrementKhatam}
                className="w-full bg-white text-green-900 font-black py-4 rounded-2xl hover:bg-green-50 transition-all shadow-md text-sm active:scale-95"
              >
                Log New Khatam
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 text-9xl opacity-10 rotate-12 pointer-events-none">
              📖
            </div>
          </div>

          {/* Badges Grid */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-800 tracking-tight">
                Badges
              </h2>
              <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase">
                {unlockedCount} / {BADGES.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlocked={badge.check(stats)}
                />
              ))}
            </div>
          </div>

          {/* Mobile-only Peak Momentum (Hidden on desktop to avoid repetition) */}
          <div className="lg:hidden bg-blue-50/50 border border-blue-100 rounded-3xl p-6 text-center">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1 text-center">
              Peak Momentum
            </p>
            <p className="text-blue-900 font-black text-xl">
              {stats.bestMonth}
            </p>
            <p className="text-blue-700 text-xs font-medium mt-1">
              {stats.bestMonthCount} days of connection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
