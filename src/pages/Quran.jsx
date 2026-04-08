import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Quran() {
  const [surahs, setSurahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/surah")
      .then((res) => res.json())
      .then((data) => {
        setSurahs(data.data);
        setLoading(false);
      });
  }, []);

  const filtered = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(search.toLowerCase()) ||
      s.englishNameTranslation.toLowerCase().includes(search.toLowerCase()) ||
      String(s.number).includes(search),
  );

  const revelationColor = (type) =>
    type === "Meccan"
      ? "bg-purple-50 text-purple-700"
      : "bg-amber-50 text-amber-700";

  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-800">The Quran</h1>
        <p className="text-gray-400 text-sm mt-1">
          114 surahs — click any to read
        </p>
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by name or number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-lg border border-gray-200 rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
      />

      {loading ? (
        <p className="text-gray-400">Loading surahs...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {filtered.map((surah) => (
            <div
              key={surah.number}
              onClick={() => navigate(`/quran/${surah.number}`)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:border-green-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
            >
              {/* Surah number badge */}
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                {surah.number}
              </div>

              {/* Surah info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-green-800">
                    {surah.englishName}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${revelationColor(surah.revelationType)}`}
                  >
                    {surah.revelationType}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">
                  {surah.englishNameTranslation}
                </p>
              </div>

              {/* Arabic name + verse count */}
              <div className="text-right flex-shrink-0">
                <p
                  className="text-green-700 font-medium text-lg"
                  style={{ fontFamily: "serif" }}
                >
                  {surah.name}
                </p>
                <p className="text-gray-300 text-xs">
                  {surah.numberOfAyahs} verses
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Quran;
