import { useCallback, useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { quizQuestions } from "../data/quizQuestions";
import { getLocalDateKey } from "../utils/date";

function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getDailyQuestion() {
  const dayOfYear = getDayOfYear();
  const index = dayOfYear % quizQuestions.length;
  return quizQuestions[index];
}

function getCategoryLabel(category) {
  switch (category) {
    case "surah_facts":
      return "Surah Facts";
    case "quran_phrases":
      return "Quran Words & Phrases";
    case "hadith_connection":
      return "Hadith Connection";
    default:
      return "Daily Challenge";
  }
}

function DailyQuizCard() {
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  const dateKey = useMemo(() => getLocalDateKey(), []);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setSaveError("");

    try {
      const todayQuestion = getDailyQuestion();
      setQuestion(todayQuestion);

      if (user) {
        const quizRef = doc(db, "users", user.uid, "dailyQuiz", dateKey);
        const quizSnap = await getDoc(quizRef);

        if (quizSnap.exists()) {
          const data = quizSnap.data();
          setSelectedAnswer(data.selectedAnswer || "");
          setSubmitted(true);
          setIsCorrect(!!data.isCorrect);
        } else {
          setSelectedAnswer("");
          setSubmitted(false);
          setIsCorrect(false);
        }
      } else {
        setSelectedAnswer("");
        setSubmitted(false);
        setIsCorrect(false);
      }
    } catch (error) {
      console.error("Daily quiz load error:", error);
      setLoadError(
        "We could not load today’s Quran challenge right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSubmit = async () => {
    if (!user || !question || !selectedAnswer || submitted) return;

    const correct = selectedAnswer === question.answer;
    setSubmitted(true);
    setIsCorrect(correct);
    setSaving(true);
    setMessage("");
    setSaveError("");

    try {
      const quizRef = doc(db, "users", user.uid, "dailyQuiz", dateKey);
      const userRef = doc(db, "users", user.uid);

      await setDoc(
        quizRef,
        {
          questionId: question.id,
          category: question.category,
          selectedAnswer,
          correctAnswer: question.answer,
          isCorrect: correct,
          completedAt: serverTimestamp(),
          dateKey,
        },
        { merge: true },
      );

      await setDoc(
        userRef,
        {
          totalQuizAnswered: increment(1),
          correctQuizAnswers: increment(correct ? 1 : 0),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setMessage(
        correct
          ? "Correct. Beautiful work — come back tomorrow for another challenge."
          : "Answer saved. Reflect on the explanation and return tomorrow for the next challenge.",
      );
    } catch (error) {
      console.error("Daily quiz save error:", error);
      setSaveError(
        "Your answer could not be saved. Please try submitting again.",
      );
      setSubmitted(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-md p-6 mb-6 border border-green-100 w-full">
        <p className="text-gray-400">Loading today&apos;s Quran challenge...</p>
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
              Daily challenge unavailable
            </p>
            <p className="text-sm text-gray-600 mb-4">{loadError}</p>
            <button
              onClick={loadQuiz}
              className="bg-green-600 text-white font-semibold px-4 py-2 rounded-2xl hover:bg-green-700 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-white rounded-3xl shadow-md p-6 mb-6 border border-amber-200 w-full">
        <div className="flex items-start gap-4">
          <div className="text-2xl">📘</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900 mb-1">
              No challenge available
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Today&apos;s challenge could not be prepared. Please refresh and
              try again.
            </p>
            <button
              onClick={loadQuiz}
              className="bg-green-600 text-white font-semibold px-4 py-2 rounded-2xl hover:bg-green-700 transition-all"
            >
              Reload Challenge
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
            Daily Quran Challenge
          </p>
          <h2 className="text-2xl font-bold text-green-900">
            {getCategoryLabel(question.category)}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            One question a day to strengthen retention and reflection
          </p>
        </div>

        <div className="bg-green-50 text-green-700 text-sm font-semibold px-4 py-2 rounded-2xl">
          {submitted ? "Completed today" : "New today"}
        </div>
      </div>

      {!user && (
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-800 font-medium">
            Sign in to save your answer and build your learning history.
          </p>
        </div>
      )}

      <div className="bg-green-50 rounded-2xl p-5 mb-5 border border-green-100">
        <p className="text-sm font-bold uppercase tracking-wider text-green-700 mb-3">
          Today&apos;s Question
        </p>
        <p className="text-lg font-semibold text-gray-900 leading-relaxed">
          {question.question}
        </p>
      </div>

      <div className="grid gap-3 mb-5">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isAnswerCorrect = submitted && option === question.answer;
          const isWrongSelected =
            submitted && isSelected && option !== question.answer;

          return (
            <button
              key={option}
              type="button"
              onClick={() => !submitted && setSelectedAnswer(option)}
              disabled={submitted}
              className={`text-left rounded-2xl border px-4 py-4 transition-all ${
                isAnswerCorrect
                  ? "border-green-500 bg-green-50 text-green-900"
                  : isWrongSelected
                    ? "border-red-300 bg-red-50 text-red-700"
                    : isSelected
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-white hover:border-green-200"
              } ${submitted ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="text-sm font-medium">{option}</span>
            </button>
          );
        })}
      </div>

      {submitted && (
        <div
          className={`rounded-2xl p-5 border mb-5 ${
            isCorrect
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Explanation
          </p>
          <p className="text-sm text-gray-800 leading-relaxed mb-2">
            {question.explanation}
          </p>
          <p className="text-xs text-gray-500">
            Reference: {question.reference}
          </p>
        </div>
      )}

      {message && (
        <div className="mb-4 text-sm font-medium text-green-700">{message}</div>
      )}

      {saveError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{saveError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!user || !selectedAnswer || submitted || saving}
          className="w-full bg-green-600 text-white font-bold py-3 rounded-2xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving
            ? "Saving..."
            : submitted
              ? isCorrect
                ? "Answered Correctly"
                : "Answered Today"
              : user
                ? "Submit Answer"
                : "Sign in to Answer"}
        </button>
      </div>
    </div>
  );
}

export default DailyQuizCard;
