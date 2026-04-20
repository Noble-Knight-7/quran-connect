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
    <div className="w-full bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-300 animate-pulse"}`}
          ></div>
          <p className="text-sm font-medium text-gray-700">
            {connected ? "Quran Foundation Synced" : "Cloud Sync Offline"}
          </p>
        </div>

        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
          >
            {disconnecting ? "..." : "Disconnect"}
          </button>
        ) : (
          <button
            onClick={startConnectFlow}
            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all shadow-sm"
          >
            Connect Now
          </button>
        )}
      </div>
    </div>
  );
}

export default QuranFoundationConnectCard;
