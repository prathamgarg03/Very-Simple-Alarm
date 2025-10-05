"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AddAlarmFormProps {
  onSave: (time: string, label: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function AddAlarmForm({ onSave, onCancel }: AddAlarmFormProps) {
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");

  const save = async () => {
    if (!time) return;
    await onSave(time, label || "Alarm");
    setTime("");
    setLabel("");
  };

  return (
    <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-neutral-400 mb-2 block">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-lg"
          />
        </div>
        <div>
          <label className="text-sm text-neutral-400 mb-2 block">Label (optional)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Wake up"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2"
          />
        </div>
        <div className="flex gap-3">
          <Button onClick={save} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-50">
            Save
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1 border-neutral-700 hover:bg-neutral-800 text-neutral-200">
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}


