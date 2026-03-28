import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";

// Step 1 — create the noticeboard
const AuthContext = createContext();

// Step 2 — create the provider (the thing that puts info ON the noticeboard)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null means not logged in
  const [loading, setLoading] = useState(true); // true while Firebase checks login status

  useEffect(() => {
    // onAuthStateChanged watches for login/logout automatically
    // Firebase calls this function every time the user logs in or out
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Save display name to Firestore so leaderboard can show it
      if (currentUser) {
        const userDoc = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userDoc);
        if (!snap.exists() || !snap.data().displayName) {
          await setDoc(
            userDoc,
            {
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL || "",
              streak: 0,
              lastReadDate: null,
            },
            { merge: true },
          ); // merge:true means don't overwrite existing fields
        }
      }
    });

    return unsubscribe; // cleanup when component unmounts
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged above will automatically detect the login and update 'user'
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Everything inside 'value' becomes available to any component that reads the noticeboard
  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Step 3 — a shortcut hook so any component can read the noticeboard easily
export function useAuth() {
  return useContext(AuthContext);
}
