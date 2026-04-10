import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_BASE_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    if (!isLocalHost) {
      return origin.replace(/\/+$/, "");
    }
  }

  return "http://localhost:5000";
};

function DailyReconnectCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  const dateKey = useMemo(() => {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  }, []);

  const getDayDiff = (previousDateKey, currentDateKey) => {
    if (!previousDateKey || !currentDateKey) return null;

    const previous = new Date(`${previousDateKey}T00:00:00`);
    const current = new Date(`${currentDateKey}T00:00:00`);

    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((current - previous) / msPerDay);
  };

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setSaveError("");
    setMessage("");

    try {
      const apiBaseUrl = getApiBaseUrl();

      const res = await fetch(
        `${apiBaseUrl}/api/daily-reconnect?date=${dateKey}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load reconnect plan");
      }

      const data = await res.json();
      setPlan(data);

      if (user) {
        const progressRef = doc(
          db,
          "users",
          user.uid,
          "dailyReconnect",
          dateKey,
        );
        const progressSnap = await getDoc(progressRef);
        setCompletedToday(
          progressSnap.exists() && progressSnap.data().completed,
        );
      } else {
        setCompletedToday(false);
      }
    } catch (error) {
      console.error("Daily reconnect load error:", error);
      setLoadError(
        "We could not load today’s reconnect session right now. Please try again.",
      );
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [dateKey, user]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleComplete = async () => {
    if (!user || !plan || completedToday) return;

    setSaving(true);
    setMessage("");
    setSaveError("");

    try {
      const dailyRef = doc(db, "users", user.uid, "dailyReconnect", dateKey);
      const userRef = doc(db, "users", user.uid);

      const [dailySnap, userSnap] = await Promise.all([
        getDoc(dailyRef),
        getDoc(userRef),
      ]);

      if (dailySnap.exists() && dailySnap.data()?.completed) {
        setCompletedToday(true);
        setMessage("Today’s reconnect session is already complete.");
        setSaving(false);
        return;
      }

      const userData = userSnap.exists() ? userSnap.data() : {};
      const lastReconnectDate = userData?.lastReconnectDate || null;
      const currentReconnectStreak = Number(userData?.reconnectStreak || 0);
      const totalReconnectSessions = Number(
        userData?.totalReconnectSessions || 0,
      );

      const dayDiff = getDayDiff(lastReconnectDate, dateKey);

      let nextReconnectStreak = 1;

      if (lastReconnectDate === dateKey) {
        nextReconnectStreak = currentReconnectStreak || 1;
      } else if (dayDiff === 1) {
        nextReconnectStreak = currentReconnectStreak + 1;
      } else {
        nextReconnectStreak = 1;
      }

      await setDoc(
        dailyRef,
        {
          completed: true,
          completedAt: serverTimestamp(),
          verseKey: plan.verseKey,
          title: plan.title,
          action: plan.action,
          reflectionPrompt: plan.reflectionPrompt,
          date: dateKey,
        },
        { merge: true },
      );

      await setDoc(
        userRef,
        {
          reconnectStreak: nextReconnectStreak,
          totalReconnectSessions: totalReconnectSessions + 1,
          lastReconnectDate: dateKey,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setCompletedToday(true);
      setMessage("Today’s reconnect session is complete. May Allah accept it.");
    } catch (error) {
      console.error("Daily reconnect save error:", error);
      setSaveError(
        "We could not save today’s reconnect progress. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 w-full">
        <p className="text-gray-400">Loading today&apos;s reconnect plan...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-3xl shadow-md p-6 mb-6 border border-amber-200 w-full">
        <div className="flex items-start gap-4">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900 mb-1">
              Daily reconnect unavailable
            </p>
            <p className="text-sm text-gray-600 mb-4">{loadError}</p>
            <button
              onClick={loadPlan}
              className="bg-green-600 text-white font-semibold px-4 py-2 rounded-2xl hover:bg-green-700 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-white rounded-3xl shadow-md p-6 mb-6 border border-amber-200 w-full">
        <div className="flex items-start gap-4">
          <div className="text-2xl">📖</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900 mb-1">
              No reconnect session available
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Today&apos;s reconnect content could not be prepared. Please try
              again.
            </p>
            <button
              onClick={loadPlan}
              className="bg-green-600 text-white font-semibold px-4 py-2 rounded-2xl hover:bg-green-700 transition-all"
            >
              Reload Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 mb-6 border border-green-100 w-full">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">
            Daily Reconnect
          </p>
          <h2 className="text-2xl font-bold text-green-900">{plan.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Day {plan.dayNumber} of {plan.totalDays}
          </p>
        </div>

        <div className="bg-green-50 text-green-700 text-sm font-semibold px-4 py-2 rounded-2xl">
          {completedToday ? "Completed today" : "Pending today"}
        </div>
      </div>

      {!user && (
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-800 font-medium">
            Sign in to save your reconnect streak and completion history.
          </p>
        </div>
      )}

      <div className="bg-green-50 rounded-2xl p-5 mb-5 border border-green-100">
        <p
          className="text-3xl text-right text-green-900 leading-loose mb-4"
          dir="rtl"
          style={{ fontFamily: "serif" }}
        >
          {plan.arabicText}
        </p>

        <p className="text-gray-700 italic leading-relaxed mb-3">
          "{plan.translationText}"
        </p>

        <p className="text-sm text-green-700 font-medium">
          Verse: {plan.verseKey}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-5">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Today&apos;s Action
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{plan.action}</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Reflection Prompt
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">
            {plan.reflectionPrompt}
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Tafsir Insight
          </p>
          <p className="text-sm text-gray-800 leading-relaxed max-h-32 overflow-y-auto">
            {plan.tafsirText}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 border border-green-100 mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2">
          AI Reflection Guide
        </p>
        <p className="text-sm text-green-900 leading-relaxed whitespace-pre-line">
          {plan.aiInsight}
        </p>
      </div>

      {message && (
        <div className="mb-4 text-sm font-medium text-green-700">{message}</div>
      )}

      {saveError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{saveError}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(`/quran/${plan.surahNumber}`)}
          className="flex-1 bg-white border border-green-200 text-green-700 font-semibold py-3 rounded-2xl hover:bg-green-50 transition-all"
        >
          Open in Reader
        </button>

        <button
          onClick={handleComplete}
          disabled={!user || completedToday || saving}
          className="flex-1 bg-green-600 text-white font-bold py-3 rounded-2xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving
            ? "Saving..."
            : completedToday
              ? "Completed Today"
              : user
                ? "Mark Today’s Session Complete"
                : "Sign in to Complete"}
        </button>
      </div>
    </div>
  );
}

export default DailyReconnectCard;
