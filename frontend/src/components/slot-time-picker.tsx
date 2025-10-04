// components/slot-time-picker.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function SlotTimePicker({
  onSelect,
}: {
  onSelect: (time: string) => void;
}) {
  const [hour, setHour] = useState("07");
  const [minute, setMinute] = useState("00");
  const [spinning, setSpinning] = useState(false);

  const spin = () => {
    setSpinning(true);
    // fake spin for ~1.2s
    const randomHour = hours[Math.floor(Math.random() * hours.length)];
    const randomMinute = minutes[Math.floor(Math.random() * minutes.length)];
    setTimeout(() => {
      setHour(randomHour);
      setMinute(randomMinute);
      setSpinning(false);
      onSelect(`${randomHour}:${randomMinute}`);
    }, 1200);
  };

  return (
    <div className="flex items-center gap-4 justify-center">
      <div className="flex gap-2 text-6xl font-mono font-bold">
        <div
          className={`w-16 h-24 flex items-center justify-center rounded-lg bg-neutral-800 border border-neutral-700 ${
            spinning ? "animate-bounce" : ""
          }`}
        >
          {hour}
        </div>
        <div className="w-4 flex items-center justify-center">:</div>
        <div
          className={`w-16 h-24 flex items-center justify-center rounded-lg bg-neutral-800 border border-neutral-700 ${
            spinning ? "animate-bounce" : ""
          }`}
        >
          {minute}
        </div>
      </div>
      <Button
        onClick={spin}
        disabled={spinning}
        className="bg-gradient-to-b from-yellow-500 to-yellow-700 text-white rounded-full px-4 py-20 text-lg"
      >
        🎰
      </Button>
    </div>
  );
}
