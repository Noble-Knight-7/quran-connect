import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuranFoundation } from "../context/QuranFoundationContext";

function QuranCallback() {
  const [searchParams] = useSearchParams();
  const { finishConnectFlow } = useQuranFoundation();
  const [error, setError] = useState("");
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    let cancelled = false;

    async function run() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        setError(oauthError);
        return;
      }

      if (!code || !state) {
        setError("Missing authorization code or state.");
        return;
      }

      try {
        await finishConnectFlow({ code, state });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Connection failed.");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [searchParams, finishConnectFlow]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <p className="text-2xl mb-3">⚠️</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Quran Foundation connection failed
            </h1>
            <p className="text-sm text-gray-500 mb-5">{error}</p>
            <button
              onClick={() => window.location.replace("/")}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium"
            >
              Return home
            </button>
          </>
        ) : (
          <>
            <p className="text-2xl mb-3">🔐</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Connecting Quran Foundation
            </h1>
            <p className="text-sm text-gray-500">
              Finishing secure sign-in and syncing your reading progress...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default QuranCallback;
