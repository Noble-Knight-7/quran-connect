import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBWTshbMZVJCOskOgfuru1UpQLCju3_4I8",
  authDomain: "quran-connect-4357d.firebaseapp.com",
  projectId: "quran-connect-4357d",
  storageBucket: "quran-connect-4357d.firebasestorage.app",
  messagingSenderId: "403211475863",
  appId: "1:403211475863:web:6361434619176cd2a002d2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// These are the two services we'll use
export const db = getFirestore(app); // database
export const auth = getAuth(app); // login system
