import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function Activity() {
  const { user } = useAuth();
  const [readDates, setReadDates] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null); // { date, x, y }

  // Load all reading history from Firebase
  useEffect(() => {
    const loadHistory = async () => {
      const historyRef = collection(db, "users", user.uid, "history");
      const snapshot = await getDocs(historyRef);

      // Put all dates into a Set for fast lookup
      // A Set is like an array but checking "does this exist" is instant
      const dates = new Set();
      snapshot.forEach((doc) => {
        dates.add(doc.id); // doc.id is the date string e.g. "2025-04-01"
      });

      setReadDates(dates);
      setLoading(false);
    };

    loadHistory();
  }, [user.uid]);

  // Generate all 365 days going back from today
  const generateDays = () => {
    const days = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
      days.push({
        date: dateString,
        dayOfWeek: date.getDay(), // 0=Sunday, 6=Saturday
        month: date.getMonth(),
        day: date.getDate(),
      });
    }
    return days;
  };

  // Group days into columns of 7 (each column = one week)
  const groupIntoWeeks = (days) => {
    const weeks = [];
    let currentWeek = [];

    // Pad the first week so it starts on the right day
    const firstDayOfWeek = days[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null); // empty slots before first day
    }

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Push the last partial week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return weeks;
  };

  // Return a Tailwind color class based on whether the day was read
  const getColor = (dateString) => {
    if (!dateString) return "bg-transparent";
    if (readDates.has(dateString)) return "bg-green-500";
    return "bg-gray-100";
  };

  // Month labels — find the first week each month appears
  const getMonthLabels = (weeks) => {
    const labels = [];
    let lastMonth = null;

    weeks.forEach((week, weekIndex) => {
      const firstRealDay = week.find((d) => d !== null);
      if (firstRealDay && firstRealDay.month !== lastMonth) {
        lastMonth = firstRealDay.month;
        labels.push({
          weekIndex,
          name: new Date(2025, firstRealDay.month).toLocaleString("default", {
            month: "short",
          }),
        });
      }
    });
    return labels;
  };

  const days = generateDays();
  const weeks = groupIntoWeeks(days);
  const monthLabels = getMonthLabels(weeks);
  const totalDaysRead = readDates.size;
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-800">Activity</h1>
        <p className="text-gray-400 text-sm mt-1">
          Your reading journey over the past year
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex gap-6">
        <div className="bg-white rounded-2xl px-8 py-5 shadow-md text-center">
          <p className="text-4xl font-bold text-green-700">{totalDaysRead}</p>
          <p className="text-gray-400 text-sm mt-1">days read</p>
        </div>
        <div className="bg-white rounded-2xl px-8 py-5 shadow-md text-center">
          <p className="text-4xl font-bold text-green-700">
            {Math.round((totalDaysRead / 365) * 100)}%
          </p>
          <p className="text-gray-400 text-sm mt-1">consistency</p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full max-w-4xl overflow-x-auto">
        <h2 className="text-green-700 font-semibold mb-4">
          {totalDaysRead} reading {totalDaysRead === 1 ? "day" : "days"} in the
          past year
        </h2>

        {loading ? (
          <p className="text-gray-400 text-center py-8">
            Loading your activity...
          </p>
        ) : (
          <div className="relative">
            {/* Month labels row */}
            <div className="flex mb-1 ml-8">
              {weeks.map((_, weekIndex) => {
                const label = monthLabels.find(
                  (l) => l.weekIndex === weekIndex,
                );
                return (
                  <div
                    key={weekIndex}
                    className="w-4 mr-1 text-xs text-gray-400"
                    style={{ minWidth: "16px" }}
                  >
                    {label ? label.name : ""}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-0">
              {/* Day of week labels */}
              <div className="flex flex-col mr-1 gap-1">
                {dayLabels.map((label, i) => (
                  <div
                    key={i}
                    className="h-4 text-xs text-gray-300 flex items-center"
                    style={{ minHeight: "16px" }}
                  >
                    {i % 2 === 1 ? label : ""}
                  </div>
                ))}
              </div>

              {/* The grid */}
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`w-4 h-4 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-green-400 hover:ring-offset-1 ${getColor(day?.date)}`}
                        style={{ minWidth: "16px", minHeight: "16px" }}
                        title={
                          day
                            ? `${day.date}${readDates.has(day.date) ? " ✓ Read" : ""}`
                            : ""
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="text-xs text-gray-400">Less</span>
              <div className="w-4 h-4 rounded-sm bg-gray-100" />
              <div className="w-4 h-4 rounded-sm bg-green-200" />
              <div className="w-4 h-4 rounded-sm bg-green-400" />
              <div className="w-4 h-4 rounded-sm bg-green-600" />
              <span className="text-xs text-gray-400">More</span>
            </div>
          </div>
        )}
      </div>

      {/* Reading log list */}
      <div className="bg-white rounded-2xl p-6 shadow-md w-full max-w-4xl">
        <h2 className="text-green-700 font-semibold mb-4">
          Recent reading days
        </h2>
        {totalDaysRead === 0 ? (
          <p className="text-gray-400 text-sm">
            No reading logged yet. Go to Home and click "I read today" to start!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...readDates]
              .sort((a, b) => b.localeCompare(a)) // newest first
              .slice(0, 20) // show last 20
              .map((date) => (
                <span
                  key={date}
                  className="bg-green-50 text-green-700 text-sm px-3 py-1 rounded-full border border-green-100"
                >
                  {date}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Activity;
