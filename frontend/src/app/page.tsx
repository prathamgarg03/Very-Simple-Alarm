// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import AlarmsPanel from "@/components/alarms-panel";
import DAOControls from "@/components/dao-controls";

export default function Page() {
  // Keep initial state undefined so server-rendered HTML doesn't include a
  // concrete time string. That prevents hydration mismatch when the client
  // replaces the placeholder with the actual time after mount.
  const [currentTime, setCurrentTime] = useState<Date | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // mark mounted and start timer only on the client
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="min-h-screen bg-black text-neutral-200">
      {/* Current Time Section */}
      <div className="h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-7xl md:text-9xl font-bold mb-4 tabular-nums tracking-tight">
            {mounted && currentTime ? (
              formatTime(currentTime)
            ) : (
              // server-rendered placeholder (stable across server and client)
              "--:--:--"
            )}
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 mb-12">
            {mounted && currentTime ? formatDate(currentTime) : ""}
          </p>
          <div className="flex justify-center">
            <div className="animate-bounce">
              <svg
                className="w-6 h-6 text-neutral-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Alarms Section */}
      <AlarmsPanel />
      
      {/* DAO Section */}
      <div className="min-h-screen bg-neutral-950 p-6">
        <div className="max-w-2xl mx-auto">
          {/* <DAOControls /> */}
        </div>
      </div>
    </div>
  );
}
