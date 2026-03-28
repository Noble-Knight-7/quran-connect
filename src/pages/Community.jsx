import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

// Monthly challenge — change this each month
const MONTHLY_CHALLENGE = {
  month: "April 2025",
  title: "Juz Amma Challenge",
  description:
    "Read all 37 surahs of Juz Amma (Surah An-Naba to An-Nas) this month.",
  target: 37,
  emoji: "🎯",
};

function LeaderboardRow({ rank, name, streak, totalDays, isCurrentUser }) {
  const rankEmoji =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isCurrentUser
          ? "bg-green-50 border border-green-200"
          : "hover:bg-gray-50"
      }`}
    >
      <span className="text-xl w-8 text-center">{rankEmoji}</span>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${isCurrentUser ? "text-green-800" : "text-gray-700"}`}
        >
          {name}{" "}
          {isCurrentUser && (
            <span className="text-xs text-green-500">(you)</span>
          )}
        </p>
        <p className="text-xs text-gray-400">{totalDays} total days read</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-green-700">{streak}</p>
        <p className="text-xs text-gray-400">day streak</p>
      </div>
    </div>
  );
}

function Community() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("streak"); // "streak" or "total"
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [challengeJoined, setChallengeJoined] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const loadCommunity = async () => {
      // Load all users for leaderboard
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);

      const users = [];
      for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();

        // Load total days from history subcollection
        const historyRef = collection(db, "users", userDoc.id, "history");
        const historySnap = await getDocs(historyRef);

        users.push({
          uid: userDoc.id,
          displayName: data.displayName || "Anonymous",
          streak: data.streak || 0,
          totalDays: historySnap.size,
          khatamCount: data.khatamCount || 0,
        });
      }

      setLeaderboard(users);

      // Load current user's challenge progress and points
      const myDoc = doc(db, "users", user.uid);
      const mySnap = await getDoc(myDoc);
      if (mySnap.exists()) {
        const myData = mySnap.data();
        setChallengeProgress(myData.challengeProgress || 0);
        setChallengeJoined(myData.challengeJoined || false);
        setPoints(myData.points || 0);
      }

      setLoading(false);
    };

    loadCommunity();
  }, [user.uid]);

  // Sort leaderboard by selected tab
  const sorted = [...leaderboard].sort((a, b) =>
    tab === "streak" ? b.streak - a.streak : b.totalDays - a.totalDays,
  );

  const joinChallenge = async () => {
    setChallengeJoined(true);
    const myDoc = doc(db, "users", user.uid);
    const mySnap = await getDoc(myDoc);
    const existing = mySnap.exists() ? mySnap.data() : {};
    await setDoc(myDoc, { ...existing, challengeJoined: true });
  };

  const updateChallengeProgress = async (newProgress) => {
    if (newProgress > MONTHLY_CHALLENGE.target) return;
    setChallengeProgress(newProgress);

    // Award points for completing the challenge
    let newPoints = points;
    if (
      newProgress === MONTHLY_CHALLENGE.target &&
      challengeProgress < MONTHLY_CHALLENGE.target
    ) {
      newPoints = points + 100;
      setPoints(newPoints);
    }

    const myDoc = doc(db, "users", user.uid);
    const mySnap = await getDoc(myDoc);
    const existing = mySnap.exists() ? mySnap.data() : {};
    await setDoc(myDoc, {
      ...existing,
      challengeProgress: newProgress,
      points: newPoints,
    });
  };

  const progressPercent = Math.round(
    (challengeProgress / MONTHLY_CHALLENGE.target) * 100,
  );

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-4 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-800">Community</h1>
        <p className="text-gray-400 text-sm mt-1">
          Compete, connect and grow together
        </p>
      </div>

      {/* Points badge */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-5 py-2">
        <span className="text-xl">⭐</span>
        <span className="font-bold text-amber-700">{points} points</span>
        <span className="text-amber-500 text-sm">
          — complete challenges to earn more
        </span>
      </div>

      {/* Monthly challenge */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{MONTHLY_CHALLENGE.emoji}</span>
          <div>
            <p className="text-xs text-green-500 font-medium uppercase tracking-wide">
              {MONTHLY_CHALLENGE.month} Challenge
            </p>
            <h2 className="text-green-800 font-bold text-lg">
              {MONTHLY_CHALLENGE.title}
            </h2>
          </div>
        </div>

        <p className="text-gray-500 text-sm mb-5">
          {MONTHLY_CHALLENGE.description}
        </p>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="text-green-700 font-medium">
              {challengeProgress} / {MONTHLY_CHALLENGE.target} surahs
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {progressPercent}% complete
          </p>
        </div>

        {/* Completed banner */}
        {challengeProgress >= MONTHLY_CHALLENGE.target && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-4">
            <p className="text-green-700 font-semibold">
              🎉 Challenge complete! +100 points awarded
            </p>
          </div>
        )}

        {/* Join or update progress */}
        {!challengeJoined ? (
          <button
            onClick={joinChallenge}
            className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-medium transition-colors"
          >
            Join challenge
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                updateChallengeProgress(Math.max(0, challengeProgress - 1))
              }
              className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 font-bold text-lg transition-colors"
            >
              −
            </button>
            <p className="flex-1 text-center text-sm text-gray-500">
              Update surahs read
            </p>
            <button
              onClick={() => updateChallengeProgress(challengeProgress + 1)}
              className="w-10 h-10 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-lg transition-colors"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-green-700 font-semibold">Leaderboard</h2>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 text-sm">
            <button
              onClick={() => setTab("streak")}
              className={`px-3 py-1 rounded-lg transition-all ${
                tab === "streak"
                  ? "bg-white text-green-700 font-medium shadow-sm"
                  : "text-gray-400"
              }`}
            >
              Streak
            </button>
            <button
              onClick={() => setTab("total")}
              className={`px-3 py-1 rounded-lg transition-all ${
                tab === "total"
                  ? "bg-white text-green-700 font-medium shadow-sm"
                  : "text-gray-400"
              }`}
            >
              Total days
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-6">
            Loading leaderboard...
          </p>
        ) : sorted.length === 0 ? (
          <p className="text-gray-400 text-center py-6">
            No users yet. Invite friends to compete!
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {sorted.map((u, index) => (
              <LeaderboardRow
                key={u.uid}
                rank={index + 1}
                name={u.displayName}
                streak={u.streak}
                totalDays={u.totalDays}
                isCurrentUser={u.uid === user.uid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Community;
