"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFriendshipAlarmDAO } from "@/hooks/useFriendshipAlarmDAO";

export default function DAOControls() {
  const {
    isConnected,
    lastVoteResult,
    connectWallet,
    stopAlarm,
  } = useFriendshipAlarmDAO();

  return (
    <Card className="bg-neutral-900 border-neutral-800 p-6">
      <h3 className="text-xl font-bold mb-4">DAO Controls</h3>
      
      <div className="space-y-4">
        <div className="flex gap-3">
          <Button
            onClick={connectWallet}
            className={isConnected ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
          >
            {isConnected ? "✅ Connected" : "Connect Wallet"}
          </Button>
          
          <Button
            onClick={stopAlarm}
            disabled={!isConnected}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            Stop Alarm
          </Button>
        </div>

        {lastVoteResult !== null && (
          <div className="mt-4 p-3 bg-neutral-800 rounded-lg">
            <p className="text-sm text-neutral-300">
              Last vote result: <span className={lastVoteResult ? "text-green-400" : "text-red-400"}>
                {lastVoteResult ? "Approved ✅" : "Denied ❌"}
              </span>
            </p>
          </div>
        )}

        {isConnected && (
          <p className="text-xs text-neutral-500">
            Connected to Friendship Alarm DAO
          </p>
        )}
      </div>
    </Card>
  );
}
