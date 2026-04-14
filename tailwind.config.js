// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "quran-gold": "#C5A059",
        "quran-deep": "#062E1C", // The dark emerald in the image
        "quran-cream": "#F9F7F2", // The soft background
        "quran-light": "#E8F2EE",
      },
      fontFamily: {
        arabic: ['"Noto Naskh Arabic"', "serif"],
        display: ['"Plus Jakarta Sans"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
