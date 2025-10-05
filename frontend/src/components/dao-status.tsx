"use client";

import { useFriendshipAlarmDAO } from "@/hooks/useFriendshipAlarmDAO";

export default function DAOStatus() {
  const { isConnected, lastVoteResult } = useFriendshipAlarmDAO();

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-neutral-400">
        DAO: {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      {lastVoteResult !== null && (
        <span className="ml-2 text-xs px-2 py-1 bg-neutral-800 rounded">
          Last vote: {lastVoteResult ? '✅' : '❌'}
        </span>
      )}
    </div>
  );
}
