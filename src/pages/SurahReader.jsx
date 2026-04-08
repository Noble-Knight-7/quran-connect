import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function SurahReader() {
  const { surahNumber } = useParams();
  const navigate = useNavigate();
  const [surah, setSurah] = useState(null);
  const [verses, setVerses] = useState([]);
  const [translation, setTranslation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize] = useState("text-3xl");

  useEffect(() => {
    setLoading(true);

    // Fetch Arabic + English translation in one call
    fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-simple,en.asad`,
    )
      .then((res) => res.json())
      .then((data) => {
        const arabic = data.data[0];
        const english = data.data[1];
        setSurah(arabic);
        setVerses(arabic.ayahs);
        setTranslation(english.ayahs);
        setLoading(false);
        // Scroll to top when surah changes
        window.scrollTo(0, 0);
      });
  }, [surahNumber]);

  const fontSizes = [
    { label: "S", value: "text-2xl" },
    { label: "M", value: "text-3xl" },
    { label: "L", value: "text-4xl" },
  ];

  const goToPrev = () => {
    if (Number(surahNumber) > 1) navigate(`/quran/${Number(surahNumber) - 1}`);
  };

  const goToNext = () => {
    if (Number(surahNumber) < 114)
      navigate(`/quran/${Number(surahNumber) + 1}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Loading surah...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-md mb-6 text-center">
        <p className="text-green-500 text-sm font-medium mb-1">
          Surah {surah.number} • {surah.revelationType} • {surah.numberOfAyahs}{" "}
          verses
        </p>
        <h1 className="text-3xl font-bold text-green-800 mb-1">
          {surah.englishName}
        </h1>
        <p className="text-gray-400 text-sm mb-3">
          {surah.englishNameTranslation}
        </p>
        <p className="text-4xl text-green-700" style={{ fontFamily: "serif" }}>
          {surah.name}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-2xl px-5 py-3 shadow-sm">
        {/* Font size */}
        <div className="flex items-center gap-1">
          {fontSizes.map((f) => (
            <button
              key={f.value}
              onClick={() => setFontSize(f.value)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                fontSize === f.value
                  ? "bg-green-700 text-white"
                  : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Translation toggle */}
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className={`text-sm px-4 py-1.5 rounded-xl transition-all font-medium ${
            showTranslation
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {showTranslation ? "Translation on" : "Translation off"}
        </button>
      </div>

      {/* Bismillah — shown for all surahs except Al-Fatiha and At-Tawbah */}
      {surah.number !== 1 && surah.number !== 9 && (
        <div className="text-center mb-8">
          <p
            className="text-3xl text-green-800"
            style={{ fontFamily: "serif" }}
          >
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </p>
        </div>
      )}

      {/* Verses */}
      <div className="flex flex-col gap-6">
        {verses.map((verse, index) => (
          <div
            key={verse.numberInSurah}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            {/* Verse number badge */}
            <div className="flex justify-between items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold">
                {verse.numberInSurah}
              </div>
            </div>

            {/* Arabic text */}
            <p
              className={`${fontSize} text-right text-green-900 leading-loose mb-4`}
              dir="rtl"
              style={{ fontFamily: "serif", lineHeight: "2.2" }}
            >
              {verse.text}
            </p>

            {/* Translation */}
            {showTranslation && (
              <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-4 italic">
                {translation[index]?.text}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Prev / Next navigation */}
      <div className="flex justify-between mt-8 gap-4">
        <button
          onClick={goToPrev}
          disabled={Number(surahNumber) === 1}
          className="flex-1 bg-white border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-600 hover:border-green-300 hover:text-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ← Previous surah
        </button>
        <button
          onClick={() => navigate("/quran")}
          className="bg-green-50 border border-green-100 rounded-2xl py-3 px-6 text-sm font-medium text-green-700 hover:bg-green-100 transition-all"
        >
          All surahs
        </button>
        <button
          onClick={goToNext}
          disabled={Number(surahNumber) === 114}
          className="flex-1 bg-white border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-600 hover:border-green-300 hover:text-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next surah →
        </button>
      </div>
    </div>
  );
}

export default SurahReader;
