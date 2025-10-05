"use client";

import { useRef, useState } from "react";
import SlotCounter from "react-slot-counter";
import { Button } from "@/components/ui/button";

type Digit = string; // '0'..'9'

function toDigits(hh: string, mm: string): [Digit, Digit, Digit, Digit] {
  return [hh[0], hh[1], mm[0], mm[1]];
}

function randomTime(): { hh: string; mm: string } {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 60);
  return { hh: String(h).padStart(2, "0"), mm: String(m).padStart(2, "0") };
}

export default function SlotTimePicker({
  onSelect,
}: {
  onSelect: (time: string) => void;
}) {
  const [digits, setDigits] = useState<[Digit, Digit, Digit, Digit]>(
    toDigits("07", "00")
  );

  // Keep the last generated time so the callback can fire after the final column ends.
  const lastTimeRef = useRef("07:00");

  const spin = () => {
    const { hh, mm } = randomTime();
    lastTimeRef.current = `${hh}:${mm}`;
    setDigits(toDigits(hh, mm));
    // The final onSelect is called from the last slot's onAnimationEnd.
  };

  const baseSlotClasses =
    "w-16 h-24 flex items-center justify-center rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden";
  const charClasses = "text-6xl font-mono font-bold leading-none";

  return (
    <div className="flex items-center gap-4 justify-center">
      <div className="flex items-center gap-2">
        {/* Slot 1: only 0 or 1 in the spin visuals */}
        <div className={baseSlotClasses}>
          <SlotCounter
            value={digits[0]}
            autoAnimationStart={false}
            duration={1.1}
            dummyCharacterCount={6}
            dummyCharacters={["0", "1"]}
            useMonospaceWidth
            charClassName={charClasses}
            containerClassName="flex"
          />
        </div>

        {/* Slot 2: visual spin across 0–9 */}
        <div className={baseSlotClasses}>
          <SlotCounter
            value={digits[1]}
            autoAnimationStart={false}
            duration={1.1}
            dummyCharacterCount={6}
            dummyCharacters={["0","1","2","3","4","5","6","7","8","9"]}
            useMonospaceWidth
            charClassName={charClasses}
            containerClassName="flex"
          />
        </div>

        <div className="w-4 flex items-center justify-center text-5xl font-mono font-bold select-none">
          :
        </div>

        {/* Slot 3: visual spin across 0–6 */}
        <div className={baseSlotClasses}>
          <SlotCounter
            value={digits[2]}
            autoAnimationStart={false}
            duration={1.1}
            dummyCharacterCount={6}
            dummyCharacters={["0","1","2","3","4","5","6"]}
            useMonospaceWidth
            charClassName={charClasses}
            containerClassName="flex"
          />
        </div>

        {/* Slot 4: visual spin across 0–9; call onSelect when this one finishes */}
        <div className={baseSlotClasses}>
          <SlotCounter
            value={digits[3]}
            autoAnimationStart={false}
            duration={1.1}
            dummyCharacterCount={6}
            dummyCharacters={["0","1","2","3","4","5","6","7","8","9"]}
            useMonospaceWidth
            charClassName={charClasses}
            containerClassName="flex"
            onAnimationEnd={() => onSelect(lastTimeRef.current)}
          />
        </div>
      </div>

      <Button
        onClick={spin}
        className="bg-gradient-to-b from-yellow-500 to-yellow-700 text-white rounded-full px-4 py-20 text-lg"
        title="Spin random time"
        aria-label="Spin random time"
      >
        🎰
      </Button>
    </div>
  );
}
