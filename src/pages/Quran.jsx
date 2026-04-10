import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://api.quran.com/api/v4";

function Quran() {
  const [surahs, setSurahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadSurahs = async () => {
      try {
        const response = await fetch(`${API_BASE}/chapters?language=en`);

        if (!response.ok) {
          throw new Error(`Failed to load surahs: ${response.status}`);
        }

        const data = await response.json();
        setSurahs(data.chapters || []);
      } catch (error) {
        console.error("Failed to load surah list:", error);
        setSurahs([]);
      } finally {
        setLoading(false);
      }
    };

    loadSurahs();
  }, []);

  const filtered = surahs.filter((s) => {
    const englishName = String(s.name_simple || "").toLowerCase();
    const translatedName = String(s.translated_name?.name || "").toLowerCase();
    const searchValue = search.toLowerCase();

    return (
      englishName.includes(searchValue) ||
      translatedName.includes(searchValue) ||
      String(s.id).includes(search)
    );
  });

  const QUICK_LINKS = [
    { name: "Al-Kahf", num: 18 },
    { name: "Yaseen", num: 36 },
    { name: "Ar-Rahman", num: 55 },
    { name: "Al-Mulk", num: 67 },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 font-black animate-pulse uppercase tracking-widest">
        Opening the Book...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-32 md:pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-green-900 tracking-tight">
            The Holy Quran
          </h1>
          <p className="text-gray-500 font-medium text-sm italic">
            "A guidance for those conscious of Allah."
          </p>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-2xl border border-green-100">
          <span className="text-green-800 font-black text-xl">
            {surahs.length || 114}
          </span>
          <span className="text-green-600 text-[10px] font-bold uppercase tracking-widest ml-2">
            Total Surahs
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-10 items-center">
        <div className="relative w-full lg:flex-1">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name, number, or meaning..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none shadow-sm rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-green-500 transition-all outline-none"
          />
        </div>

        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.num}
              onClick={() => navigate(`/quran/${link.num}`)}
              className="whitespace-nowrap bg-white border border-gray-100 px-4 py-2.5 rounded-xl text-[11px] font-black text-gray-500 uppercase tracking-wider hover:border-green-300 hover:text-green-600 transition-all shadow-sm"
            >
              {link.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((surah) => (
          <div
            key={surah.id}
            onClick={() => navigate(`/quran/${surah.id}`)}
            className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-50 hover:border-green-200 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-5">
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="absolute inset-0 bg-green-100 rounded-2xl rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-white border-2 border-green-500 rounded-2xl flex items-center justify-center">
                  <span className="text-green-800 font-black text-sm">
                    {surah.id}
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="font-black text-gray-800 text-lg leading-tight group-hover:text-green-700 transition-colors">
                  {surah.name_simple}
                </h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  {surah.translated_name?.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      surah.revelation_place === "makkah"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {surah.revelation_place}
                  </span>
                  <span className="text-[9px] font-black text-gray-300 uppercase">
                    {surah.verses_count} Verses
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p
                className="text-2xl font-black text-green-900 mb-1"
                dir="rtl"
                style={{ fontFamily: "serif" }}
              >
                {surah.name_arabic}
              </p>
              <div className="w-8 h-1 bg-green-100 rounded-full ml-auto group-hover:w-full transition-all duration-500"></div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <p className="text-4xl mb-4">📖</p>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
            No Surah matches your search
          </p>
        </div>
      )}
    </div>
  );
}

export default Quran;
