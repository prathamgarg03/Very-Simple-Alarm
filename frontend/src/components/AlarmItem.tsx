"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface AlarmItemProps {
  alarm: {
    _id: Id<"alarms">;
    time: string;
    label: string;
    enabled: boolean;
    triggered?: boolean;
  };
  index: number;
  onToggle: (id: Id<"alarms">) => void;
  onDelete: (id: Id<"alarms">) => void;
}

export default function AlarmItem({ alarm, index, onToggle, onDelete }: AlarmItemProps) {
  return (
    <Card
      className={`bg-neutral-900 border-neutral-800 p-4 ${alarm.triggered ? "ring-2 ring-neutral-300 animate-pulse" : ""}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-3xl font-bold tabular-nums">{alarm.time}</div>
          <div className="text-sm text-neutral-400 mt-1">{alarm.label}</div>
        </div>
        <div className="flex items-center gap-4">
          <Switch checked={alarm.enabled} onCheckedChange={() => onToggle(alarm._id)} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(alarm._id)}
            className="text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}


