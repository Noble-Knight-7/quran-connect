import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../AuthContext";

const QuranFoundationContext = createContext(null);

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_BASE_URL?.trim();

  if (envUrl) return envUrl.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    if (!isLocalHost) {
      return origin.replace(/\/+$/, "");
    }
  }

  return "http://localhost:5000";
};

const API_BASE_URL = getApiBaseUrl();
const TOKEN_HOST =
  process.env.REACT_APP_QF_TOKEN_HOST ||
  "https://prelive-oauth2.quran.foundation";
const CLIENT_ID = process.env.REACT_APP_QF_CLIENT_ID || "";

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });

  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ("0" + (b % 36).toString(36)).slice(-1)).join(
    "",
  );
}

async function sha256(input) {
  const encoded = new TextEncoder().encode(input);
  return window.crypto.subtle.digest("SHA-256", encoded);
}

export function QuranFoundationProvider({ children }) {
  const { user } = useAuth();

  const [connected, setConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [latestReadingSession, setLatestReadingSession] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!user?.uid) {
      setConnected(false);
      setCheckingStatus(false);
      return;
    }

    try {
      setCheckingStatus(true);
      const response = await fetch(`${API_BASE_URL}/api/qf/auth/status`, {
        headers: {
          "x-user-id": user.uid,
        },
      });
      const data = await response.json();
      setConnected(Boolean(data?.connected));
    } catch (error) {
      console.error("Failed to fetch QF status:", error);
      setConnected(false);
    } finally {
      setCheckingStatus(false);
    }
  }, [user]);

  const fetchLatestReadingSession = useCallback(async () => {
    if (!user?.uid) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/qf/reading-session`, {
        headers: {
          "x-user-id": user.uid,
        },
      });

      const data = await response.json();
      if (!response.ok) return null;

      setLatestReadingSession(data?.data || null);
      return data?.data || null;
    } catch (error) {
      console.error("Failed to fetch reading session:", error);
      return null;
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (connected) {
      fetchLatestReadingSession();
    } else {
      setLatestReadingSession(null);
    }
  }, [connected, fetchLatestReadingSession]);

  const startConnectFlow = useCallback(async () => {
    if (!user?.uid || !CLIENT_ID) {
      alert("Missing user or REACT_APP_QF_CLIENT_ID");
      return;
    }

    const codeVerifier = randomString(96);
    const codeChallenge = base64UrlEncode(await sha256(codeVerifier));
    const state = randomString(48);
    const nonce = randomString(48);
    const redirectUri = `${window.location.origin}/qf/callback`;

    sessionStorage.setItem("qf_code_verifier", codeVerifier);
    sessionStorage.setItem("qf_state", state);
    sessionStorage.setItem("qf_nonce", nonce);
    sessionStorage.setItem("qf_redirect_uri", redirectUri);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "openid offline_access user reading_session",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    window.location.href = `${TOKEN_HOST}/oauth2/auth?${params.toString()}`;
  }, [user]);

  const finishConnectFlow = useCallback(
    async ({ code, state }) => {
      if (!user?.uid) throw new Error("User not signed in.");

      const savedState = sessionStorage.getItem("qf_state");
      const codeVerifier = sessionStorage.getItem("qf_code_verifier");
      const nonce = sessionStorage.getItem("qf_nonce");
      const redirectUri =
        sessionStorage.getItem("qf_redirect_uri") ||
        `${window.location.origin}/qf/callback`;

      if (!savedState || state !== savedState) {
        throw new Error("Invalid OAuth state.");
      }

      if (!codeVerifier) {
        throw new Error("Missing PKCE verifier.");
      }

      console.log("QF callback: starting token exchange");

      const response = await fetch(`${API_BASE_URL}/api/qf/auth/exchange`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri,
          nonce,
        }),
      });

      console.log("QF callback: exchange response received");

      const data = await response.json();
      console.log("QF callback: exchange json parsed", data);

      if (!response.ok) {
        const detailText =
          data?.details?.error_description ||
          data?.details?.error ||
          data?.message ||
          "QF token exchange failed.";
        throw new Error(detailText);
      }

      sessionStorage.removeItem("qf_state");
      sessionStorage.removeItem("qf_code_verifier");
      sessionStorage.removeItem("qf_nonce");
      sessionStorage.removeItem("qf_redirect_uri");

      console.log("QF callback: marking connected");
      setConnected(true);

      // Fire and forget. Do not block redirect.
      fetchLatestReadingSession().catch((error) => {
        console.error("Post-connect reading session fetch failed:", error);
      });

      console.log("QF callback: redirecting home");
      window.location.replace("/");

      return data;
    },
    [user, fetchLatestReadingSession],
  );

  const saveReadingSession = useCallback(
    async ({ chapterNumber, verseNumber }) => {
      if (!connected || !user?.uid) return null;

      try {
        const response = await fetch(`${API_BASE_URL}/api/qf/reading-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.uid,
          },
          body: JSON.stringify({
            chapterNumber,
            verseNumber,
          }),
        });

        const data = await response.json();
        if (!response.ok) return null;

        setLatestReadingSession({
          chapterNumber: Number(chapterNumber),
          verseNumber: Number(verseNumber),
        });

        return data;
      } catch (error) {
        console.error("Failed to save reading session:", error);
        return null;
      }
    },
    [connected, user],
  );

  const value = useMemo(
    () => ({
      connected,
      checkingStatus,
      latestReadingSession,
      startConnectFlow,
      finishConnectFlow,
      saveReadingSession,
      fetchLatestReadingSession,
    }),
    [
      connected,
      checkingStatus,
      latestReadingSession,
      startConnectFlow,
      finishConnectFlow,
      saveReadingSession,
      fetchLatestReadingSession,
    ],
  );

  return (
    <QuranFoundationContext.Provider value={value}>
      {children}
    </QuranFoundationContext.Provider>
  );
}

export function useQuranFoundation() {
  const context = useContext(QuranFoundationContext);
  if (!context) {
    throw new Error(
      "useQuranFoundation must be used within QuranFoundationProvider",
    );
  }
  return context;
}
