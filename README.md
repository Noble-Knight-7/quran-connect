# Quran Connect

**Retaining the Connection with the Quran After Ramadan**

Quran Connect is a web app built for the Quran Foundation hackathon to help Muslims maintain a living, daily relationship with the Quran after Ramadan. It combines Quran reading, daily reconnect prompts, AI reflection, streak tracking, journaling, and community motivation in one experience.

## Why this exists

Many people reconnect deeply with the Quran in Ramadan, then struggle to maintain that momentum afterwards. Quran Connect is designed to solve that drop-off by making Quran engagement:

- consistent
- reflective
- rewarding
- community-supported
- accessible across daily life

## Core features

### Daily Quran habit system

- Daily streak tracker
- Daily surah logging
- Activity history
- Total active days tracking

### Surah reading experience

- Read any surah
- Arabic text display
- Translation selector
- Tafsir selector
- Transliteration toggle
- Word analysis toggle
- Verse audio playback
- Full surah recitation playback
- Verse highlighting during playback
- Juz / Hizb / Ruku / Manzil markers

### Daily Reconnect

- A guided daily reconnect card
- Selected verse of the day
- Translation + tafsir insight
- AI-generated reflection guide
- Daily completion tracking

### Reflection and journaling

- AI verse reflection in sidebar
- Personal reflection journal per verse
- Saved reflections to Firestore

### Community and motivation

- Leaderboard by streak
- Leaderboard by total active days
- Challenge cards
- Reward points system

## Quran Foundation API usage

This project uses Quran Foundation APIs for Quran content and tafsir data.

### Content API usage

Used endpoints include:

- `chapters`
- `verses/by_chapter`
- `verses/by_key`
- `quran/translations`
- `resources/translations`
- `resources/tafsirs`
- `tafsirs/by_ayah`

These power:

- surah reading
- verse display
- translations
- tafsir
- word-level analysis
- metadata chips
- daily reconnect content

## Additional API usage

### Google Gemini API

Used for:

- daily reconnect AI reflection
- verse reflection generation

### Firebase

Used for:

- authentication
- Firestore user data
- streak tracking
- reading history
- reflections
- leaderboard data
- challenge progress

## Tech stack

### Frontend

- React
- React Router
- Firebase Web SDK
- Tailwind-style utility classes

### Backend

- Node.js
- Express
- Firebase Admin SDK
- Axios
- CORS
- dotenv

### Database / auth

- Firebase Firestore
- Firebase Authentication

### Deployment

- Vercel

## Project structure

```text
quran-connect/
├── src/
│   ├── components/
│   ├── pages/
│   ├── firebase.js
│   ├── AuthContext.js
│   └── ...
├── server/
│   ├── index.js
│   ├── firebaseAdmin.js
│   ├── reconnectPlan.js
│   └── package.json
├── package.json
└── README.md
```
