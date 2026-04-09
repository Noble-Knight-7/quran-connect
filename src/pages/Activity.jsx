import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

function Activity() {
  const { user } = useAuth();
  const [readData, setReadData] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ streak: 0, thisMonth: 0 });

  useEffect(() => {
    const loadHistory = async () => {
      const historyRef = collection(db, "users", user.uid, "history");
      const snapshot = await getDocs(historyRef);
      const userDoc = await getDoc(doc(db, "users", user.uid));

      const dataMap = {};
      let monthCount = 0;
      const currentMonth = new Date().toISOString().split("-")[1];

      snapshot.forEach((doc) => {
        const date = doc.id;
        const count = doc.data().count || 1;
        dataMap[date] = count;
        if (date.split("-")[1] === currentMonth) monthCount += count;
      });

      setReadData(dataMap);
      setStats({
        streak: userDoc.exists() ? userDoc.data().streak || 0 : 0,
        thisMonth: monthCount,
      });
      setLoading(false);
    };
    loadHistory();
  }, [user.uid]);

  // Evolutionized Intensity Logic
  const getIntensityColor = (dateString) => {
    if (!dateString || !readData[dateString]) return "bg-gray-50 text-gray-300";
    const count = readData[dateString];
    if (count >= 5)
      return "bg-green-700 text-white shadow-[0_0_10px_rgba(21,128,61,0.3)]";
    if (count >= 3)
      return "bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.2)]";
    return "bg-green-300 text-green-900";
  };

  // Helper to generate a full month grid
  const getMonthGrid = (monthOffset = 0) => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - monthOffset);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleString("default", { month: "long" });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    // Padding for start of month
    for (let i = 0; i < firstDay; i++) grid.push(null);
    // Real days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      grid.push({ dayNum: i, date: dateStr });
    }
    return { name: monthName, year, grid };
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 font-black animate-pulse uppercase tracking-widest">
        Loading Activity...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-32 md:pb-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-green-900 tracking-tight">
          Activity
        </h1>
        <p className="text-gray-500 font-medium text-sm">
          Review your consistency and session depth.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl">
            📖
          </div>
          <div>
            <p className="text-3xl font-black text-gray-800">
              {Object.keys(readData).length}
            </p>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              Total Days
            </p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl">
            🔥
          </div>
          <div>
            <p className="text-3xl font-black text-gray-800">{stats.streak}</p>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              Current Streak
            </p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">
            📅
          </div>
          <div>
            <p className="text-3xl font-black text-gray-800">
              {stats.thisMonth}
            </p>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              This Month
            </p>
          </div>
        </div>
      </div>

      {/* Consistency Maps Section */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">
            Consistency Map
          </h2>
          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>Light</span>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 rounded-md bg-gray-100" />
              <div className="w-4 h-4 rounded-md bg-green-300" />
              <div className="w-4 h-4 rounded-md bg-green-500" />
              <div className="w-4 h-4 rounded-md bg-green-700" />
            </div>
            <span>Deep</span>
          </div>
        </div>

        {/* Multi-Month Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[0, 1, 2].map((offset) => {
            const { name, year, grid } = getMonthGrid(offset);
            return (
              <div key={offset} className="flex flex-col">
                <p className="text-sm font-black text-green-800 mb-4 uppercase tracking-widest border-l-4 border-green-500 pl-3">
                  {name} <span className="text-gray-300 ml-1">{year}</span>
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                    <div
                      key={d}
                      className="text-center text-[10px] font-black text-gray-300 mb-2"
                    >
                      {d}
                    </div>
                  ))}
                  {grid.map((day, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-xl flex items-center justify-center text-[11px] font-black transition-all duration-300 
                        ${day ? getIntensityColor(day.date) : "bg-transparent"} 
                        ${day ? "hover:scale-110 cursor-default" : ""}`}
                      title={day?.date}
                    >
                      {day?.dayNum}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-800 tracking-tight mb-6">
          Activity Stream
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.keys(readData)
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 12)
            .map((date) => (
              <div
                key={date}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-green-200 transition-all"
              >
                <div>
                  <p className="text-sm font-black text-gray-800">
                    {new Date(date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
                    Completed
                  </p>
                </div>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm ${getIntensityColor(date)}`}
                >
                  {readData[date]}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default Activity;
