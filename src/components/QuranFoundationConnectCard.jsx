import { useState } from "react";
import { useQuranFoundation } from "../context/QuranFoundationContext";

function QuranFoundationConnectCard() {
  const { connected, checkingStatus, startConnectFlow, disconnect } =
    useQuranFoundation();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect Quran Foundation:", error);
    } finally {
      setDisconnecting(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="w-full md:w-auto bg-white rounded-2xl shadow-sm px-4 py-3 border border-gray-100 animate-pulse">
        <span className="text-xs text-gray-400 font-medium">Syncing...</span>
      </div>
    );
  }

  return (
    <div className="w-full md:w-auto bg-white rounded-2xl shadow-sm px-4 py-3 border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-sm font-semibold text-gray-800 leading-snug sm:whitespace-nowrap">
          {connected
            ? "Connected with Quran Foundation"
            : "Connect with Quran Foundation"}
        </p>

        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : (
          <button
            onClick={startConnectFlow}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-xs font-bold transition-colors shadow-sm"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

export default QuranFoundationConnectCard;
