export function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getDayDiff(previousDateKey, currentDateKey) {
  if (!previousDateKey || !currentDateKey) return null;

  const [prevYear, prevMonth, prevDay] = previousDateKey.split("-").map(Number);
  const [currYear, currMonth, currDay] = currentDateKey.split("-").map(Number);

  const previous = new Date(prevYear, prevMonth - 1, prevDay);
  const current = new Date(currYear, currMonth - 1, currDay);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((current - previous) / msPerDay);
}
