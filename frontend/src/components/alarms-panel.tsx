// components/alarms-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SlotTimePicker from "./slot-time-picker";

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  triggered: boolean;
}

export default function AlarmsPanel() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlarmTime, setNewAlarmTime] = useState("");
  const [newAlarmLabel, setNewAlarmLabel] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      checkAlarms(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [alarms]);

  const checkAlarms = (now: Date) => {
    const currentTimeStr = now.toTimeString().slice(0, 5);
    alarms.forEach((alarm) => {
      if (alarm.enabled && !alarm.triggered && alarm.time === currentTimeStr) {
        triggerAlarm(alarm.id);
      }
    });
  };

  const triggerAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, triggered: true } : a))
    );
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVKzn7a1aFwxKouHyvmsjCDCF0fPTgjMGHm7A7+OZUA0PVKzn7a1aFwxKouHyvmsjCDCF0fPTgjMGHm7A7+OZUA0PVKzn7a1aFwxKouHyvmsjCDCF"
    );
    audio.play().catch(() => {});
    setTimeout(() => {
      setAlarms((prev) =>
        prev.map((a) => (a.id === id ? { ...a, triggered: false } : a))
      );
    }, 3000);
  };

  const addAlarm = () => {
    if (!newAlarmTime) return;
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: newAlarmTime,
      label: newAlarmLabel || "Alarm",
      enabled: true,
      triggered: false,
    };
    setAlarms((prev) =>
      [...prev, newAlarm].sort((a, b) => a.time.localeCompare(b.time))
    );
    setNewAlarmTime("");
    setNewAlarmLabel("");
    setShowAddForm(false);
  };

  const deleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Alarms</h2>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {showAddForm && (
          <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-neutral-400 mb-2 block">
                  Time
                </label>
                <SlotTimePicker onSelect={(time) => setNewAlarmTime(time)} />
                <input
                  type="time"
                  value={newAlarmTime}
                  onChange={(e) => setNewAlarmTime(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-2 block">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={newAlarmLabel}
                  onChange={(e) => setNewAlarmLabel(e.target.value)}
                  placeholder="Wake up"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={addAlarm}
                  className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-50"
                >
                  Save
                </Button>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="flex-1 border-neutral-700 hover:bg-neutral-800 text-neutral-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {alarms.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No alarms set</p>
            </div>
          ) : (
            alarms.map((alarm, index) => (
              <Card
                key={alarm.id}
                className={`bg-neutral-900 border-neutral-800 p-4 animate-in slide-in-from-bottom-2 duration-300 transition-all ${
                  alarm.triggered ? "ring-2 ring-neutral-300 animate-pulse" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-3xl font-bold tabular-nums">
                      {alarm.time}
                    </div>
                    <div className="text-sm text-neutral-400 mt-1">
                      {alarm.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={alarm.enabled}
                      onCheckedChange={() => toggleAlarm(alarm.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlarm(alarm.id)}
                      className="text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
