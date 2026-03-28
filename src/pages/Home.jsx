import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import StreakTracker from "../StreakTracker";

function Home() {
  const { user } = useAuth();
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/ayah/1:1/editions/quran-simple,en.asad")
      .then((res) => res.json())
      .then((data) => {
        setVerse(data.data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-800">Quran Connect</h1>
        <p className="text-gray-400 text-sm mt-1">
          Assalamu Alaikum, {user.displayName}
        </p>
      </div>

      <StreakTracker userId={user.uid} />

      <div className="bg-white rounded-2xl p-8 shadow-md w-full max-w-lg">
        <h2 className="text-green-700 text-lg font-semibold mb-4">
          Verse of the day
        </h2>
        {loading ? (
          <p className="text-gray-400 text-center">Loading verse...</p>
        ) : (
          <div>
            <p
              className="text-3xl text-right text-green-900 leading-loose mb-4"
              dir="rtl"
            >
              {verse[0].text}
            </p>
            <p className="text-gray-600 italic mb-3">"{verse[1].text}"</p>
            <p className="text-sm text-green-600 font-medium">
              — Surah {verse[0].surah.englishName}, Verse{" "}
              {verse[0].numberInSurah}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
