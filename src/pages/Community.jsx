import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

const CHALLENGES = [
  {
    id: "juz_amma",
    month: "April 2026",
    title: "Juz Amma Quest",
    description: "Connect with the final 37 Surahs of the Quran.",
    target: 37,
    emoji: "🎯",
    color: "from-green-600 to-green-800",
  },
  {
    id: "surah_mulk",
    month: "April 2026",
    title: "The Protector",
    description: "Read Surah Al-Mulk 7 nights in a row.",
    target: 7,
    emoji: "🌌",
    color: "from-blue-700 to-indigo-900",
  },
];

function LeaderboardRow({
  rank,
  name,
  streak,
  totalDays,
  isCurrentUser,
  photoURL,
}) {
  const isTopThree = rank <= 3;
  const rankColors = ["text-amber-500", "text-slate-400", "text-orange-400"];

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isCurrentUser ? "bg-green-50/50 border border-green-100" : "hover:bg-gray-50"}`}
    >
      <div
        className={`text-lg font-black w-8 text-center ${isTopThree ? rankColors[rank - 1] : "text-gray-300"}`}
      >
        {rank === 1 ? "👑" : rank}
      </div>

      <div className="relative">
        {photoURL ? (
          <img
            src={photoURL}
            referrerPolicy="no-referrer" // THE FIX: Allows Google images to load
            alt={name}
            className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-700 font-bold border border-green-200 shadow-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        {isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`font-bold truncate ${isCurrentUser ? "text-green-900" : "text-gray-800"}`}
        >
          {name}{" "}
          {isCurrentUser && (
            <span className="text-[10px] bg-green-200 text-green-700 px-1.5 py-0.5 rounded-md ml-1 uppercase">
              You
            </span>
          )}
        </p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {totalDays} Days Active
        </p>
      </div>

      <div className="text-right">
        <p className="font-black text-green-700 text-lg leading-none">
          {streak}
        </p>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
          Day Streak
        </p>
      </div>
    </div>
  );
}

function Community() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("streak");
  const [userStats, setUserStats] = useState({
    points: 0,
    challengeProgress: {},
  });

  useEffect(() => {
    const loadCommunity = async () => {
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      const users = usersSnap.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
        displayName: doc.data().displayName || "Soul",
        streak: doc.data().streak || 0,
        totalDays: doc.data().totalDays || 0,
      }));

      setLeaderboard(users);

      const myDoc = await getDoc(doc(db, "users", user.uid));
      if (myDoc.exists()) {
        setUserStats({
          points: myDoc.data().points || 0,
          challengeProgress: myDoc.data().challengeProgress || {},
          challengeJoined: myDoc.data().challengeJoined || [],
        });
      }
      setLoading(false);
    };
    loadCommunity();
  }, [user.uid]);

  const sorted = [...leaderboard]
    .sort((a, b) =>
      tab === "streak" ? b.streak - a.streak : b.totalDays - a.totalDays,
    )
    .slice(0, 10);

  const updateChallenge = async (id, step) => {
    const current = userStats.challengeProgress[id] || 0;
    const challenge = CHALLENGES.find((c) => c.id === id);
    if (current + step > challenge.target || current + step < 0) return;

    const newProgress = current + step;
    const newPoints =
      newProgress === challenge.target
        ? userStats.points + 150
        : userStats.points;

    const updatedMap = { ...userStats.challengeProgress, [id]: newProgress };
    setUserStats((prev) => ({
      ...prev,
      points: newPoints,
      challengeProgress: updatedMap,
    }));

    await setDoc(
      doc(db, "users", user.uid),
      {
        challengeProgress: updatedMap,
        points: newPoints,
      },
      { merge: true },
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 font-black italic">
        CONNECTING TO COMMUNITY...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-32 md:pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-green-900 tracking-tight">
            Community
          </h1>
          <p className="text-gray-500 font-medium text-sm">
            Grow together, compete for good deeds.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">
              Your Rewards
            </p>
            <p className="text-xl font-black text-amber-800 leading-none mt-1">
              {userStats.points} Points
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Challenges */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4 flex items-center gap-2">
            Active Challenges{" "}
            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-lg">
              {CHALLENGES.length}
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHALLENGES.map((c) => {
              const progress = userStats.challengeProgress[c.id] || 0;
              const percent = Math.round((progress / c.target) * 100);
              const isComplete = progress === c.target;

              return (
                <div
                  key={c.id}
                  className={`bg-gradient-to-br ${c.color} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group`}
                >
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-3xl bg-white/20 backdrop-blur-md p-2 rounded-xl">
                          {c.emoji}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md">
                          {c.month}
                        </span>
                      </div>
                      <h3 className="text-lg font-black leading-tight mb-1">
                        {c.title}
                      </h3>
                      <p className="text-white/70 text-xs font-medium mb-4 line-clamp-2">
                        {c.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1.5">
                        <span>Progress</span>
                        <span>
                          {progress} / {c.target}
                        </span>
                      </div>
                      <div className="w-full bg-black/20 rounded-full h-2 mb-4">
                        <div
                          className="bg-white h-full rounded-full transition-all duration-700"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {isComplete ? (
                        <div className="bg-white/20 backdrop-blur-md text-center py-2 rounded-xl text-xs font-black uppercase">
                          Completed 🎉
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateChallenge(c.id, 1)}
                            className="flex-1 bg-white text-gray-900 font-black py-2 rounded-xl text-xs hover:bg-green-50 transition-colors"
                          >
                            Log Progress
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 text-7xl opacity-10 group-hover:scale-125 transition-transform duration-700">
                    {c.emoji}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              Community Collective
            </h3>
            <h2 className="text-xl font-black text-green-900 mb-4">
              Ramadan Spirit Continues
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Total community days read this month:{" "}
              <span className="font-bold text-gray-800">1,432 / 5,000</span>
            </p>
            <div className="w-full bg-gray-50 rounded-full h-4 overflow-hidden border border-gray-100">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full"
                style={{ width: "28%" }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase">
              Unlock Community Badge at 5,000 days
            </p>
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-gray-800 tracking-tight">
                Leaderboard
              </h2>

              <div className="flex bg-gray-50 p-1 rounded-xl">
                {["streak", "total"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      tab === t
                        ? "bg-white text-green-700 shadow-sm"
                        : "text-gray-400"
                    }`}
                  >
                    {t === "streak" ? "🔥 Streak" : "📅 Total"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              {sorted.map((u, index) => (
                <LeaderboardRow
                  key={u.uid}
                  rank={index + 1}
                  name={u.displayName}
                  streak={u.streak}
                  totalDays={u.totalDays}
                  isCurrentUser={u.uid === user.uid}
                  photoURL={u.photoURL}
                />
              ))}
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-2xl text-center">
              <p className="text-xs font-medium text-gray-500 italic">
                "The best of people are those who are most beneficial to
                others."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Community;
