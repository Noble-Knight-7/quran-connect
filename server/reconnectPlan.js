const reconnectPlan = [
  {
    verseKey: "1:1",
    title: "Begin with Allah",
    action: "Read Surah Al-Fatihah slowly and with presence.",
    reflectionPrompt:
      "What intention do I want to set for my relationship with the Quran today?",
  },
  {
    verseKey: "2:2",
    title: "This Book is Guidance",
    action: "Read the first 5 ayahs of Surah Al-Baqarah.",
    reflectionPrompt:
      "Where in my life do I most need Allah's guidance right now?",
  },
  {
    verseKey: "2:255",
    title: "Return to Awe",
    action: "Read Ayat al-Kursi and sit with its meaning for one minute.",
    reflectionPrompt:
      "Which part of Allah's greatness in this verse affects my heart most?",
  },
  {
    verseKey: "39:53",
    title: "Never Despair",
    action: "Read this verse and make a short dua for forgiveness.",
    reflectionPrompt:
      "Is there any guilt or distance from Allah that I need to bring back to Him today?",
  },
  {
    verseKey: "94:5",
    title: "Hardship and Ease",
    action: "Read Surah Ash-Sharh fully.",
    reflectionPrompt:
      "What current hardship can I reinterpret through hope in Allah?",
  },
  {
    verseKey: "93:3",
    title: "You Are Not Abandoned",
    action: "Read Surah Ad-Duha and reflect on Allah's care.",
    reflectionPrompt:
      "When have I forgotten Allah's mercy in my life, and how can I remember it now?",
  },
  {
    verseKey: "112:1",
    title: "Renew Tawhid",
    action: "Read Surah Al-Ikhlas 3 times with full attention.",
    reflectionPrompt: "How can I make my worship more sincere for Allah alone?",
  },
];

function getReconnectPlanForDate(dateString) {
  const safeDate = dateString ? new Date(dateString) : new Date();
  const startOfYear = new Date(safeDate.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((safeDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

  const index = (dayOfYear - 1) % reconnectPlan.length;
  return {
    dayNumber: index + 1,
    totalDays: reconnectPlan.length,
    item: reconnectPlan[index],
  };
}

module.exports = { reconnectPlan, getReconnectPlanForDate };
