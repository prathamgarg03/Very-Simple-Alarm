"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Bell, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Script from "next/script";

declare global {
  interface Window {
    faceapi: {
      nets: {
        tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> }
        faceLandmark68Net: { loadFromUri: (uri: string) => Promise<void> }
      }
      TinyFaceDetectorOptions: any
      detectAllFaces: (video: HTMLVideoElement, options?: any) => any
    }
  }
}
import DAOControls from "./dao-controls";
// import FriendshipAlarmDAOAbi from "../../abi/FriendshipAlarmDAO.json";




interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: string | null;
}

export default function AlarmsPanel() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlarmTime, setNewAlarmTime] = useState("");
  const [newAlarmLabel, setNewAlarmLabel] = useState("");
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [isAwake, setIsAwake] = useState(false);
  const [earValue, setEarValue] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const EAR_THRESHOLD = 0.28;

  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      if (!window.faceapi) {
        console.error("face-api.js not loaded");
        return;
      }
      
      try {
        await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await window.faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        console.log('Face detection models loaded');
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };

    if (typeof window !== 'undefined' && window.faceapi) {
      loadModels();
    }
  }, []);

  // Start video when alarm triggers
  useEffect(() => {
    if (activeAlarm && modelsLoaded) {
      startVideo();
    } else if (!activeAlarm) {
      stopVideo();
    }
  }, [activeAlarm, modelsLoaded]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startEyeDetection();
        }
      })
      .catch(err => console.error('Camera error:', err));
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsAwake(false);
    setEarValue(0);
  };

  const startEyeDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi) return;

      try {
        const detections = await window.faceapi
          .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detections.length > 0) {
          const landmarks = detections[0].landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          
          if (leftEye.length === 6 && rightEye.length === 6) {
            const leftEAR = getEAR(leftEye);
            const rightEAR = getEAR(rightEye);
            const avgEAR = (leftEAR + rightEAR) / 2;

            setEarValue(avgEAR);
            setIsAwake(avgEAR > EAR_THRESHOLD);
          }
        } else {
          setIsAwake(false);
          setEarValue(0);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
    }, 300);
  };

  const euclideanDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  const getEAR = (eye: Array<{ x: number; y: number }>) => {
    const A = euclideanDistance(eye[1], eye[5]);
    const B = euclideanDistance(eye[2], eye[4]);
    const C = euclideanDistance(eye[0], eye[3]);
    return (A + B) / (2.0 * C);
  };

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
      if (
        alarm.enabled &&
        alarm.time === currentTimeStr &&
        alarm.lastTriggered !== currentTimeStr
      ) {
        triggerAlarm(alarm.id, currentTimeStr);
      }
    });
  };

  const triggerAlarm = (id: string, currentTimeStr: string) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
  
    setAlarms((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, triggered: true, lastTriggered: currentTimeStr }
          : a
      )
    );
    setActiveAlarm(alarm);
  
    // Play alarm sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio("/alarm.mp3");
    audio.loop = true;
    audio.play().catch(() => {});
    audioRef.current = audio;
  };

  const stopAlarm = () => {
    if (!isAwake) {
      // Don't stop if eyes aren't open
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (activeAlarm) {
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5);
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === activeAlarm.id
            ? { ...a, triggered: false, lastTriggered: currentTimeStr }
            : a
        )
      );
    }
    setActiveAlarm(null);
  };

  const snoozeAlarm = () => {
    if (!isAwake || !activeAlarm) {
      // Don't snooze if eyes aren't open
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Add +5 mins
    const [hours, minutes] = activeAlarm.time.split(":").map(Number);
    const snoozeDate = new Date();
    snoozeDate.setHours(hours, minutes + 5, 0, 0);
    const snoozeTime = snoozeDate.toTimeString().slice(0, 5);

    setAlarms((prev) =>
      prev.map((a) =>
        a.id === activeAlarm.id
          ? { ...a, time: snoozeTime, triggered: false, lastTriggered: null }
          : a
      )
    );
    setActiveAlarm(null);
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
    <>
      <Script src="/face-api.min.js" strategy="beforeInteractive" />
      
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

          {/* Add form */}
          {showAddForm && (
            <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Time
                  </label>
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

          {/* List of alarms */}
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
  
        {/* DAO Integration Section */}
        <div className="mt-12">
          <DAOControls />
        </div>
      </div>

        {/* Alarm Dialog - Cannot be closed by clicking outside or X button */}
        <Dialog 
          open={!!activeAlarm} 
          onOpenChange={() => {}} // Prevent closing
        >
          <DialogContent 
            className="sm:max-w-md"
            onPointerDownOutside={(e) => e.preventDefault()} // Block outside clicks
            onEscapeKeyDown={(e) => e.preventDefault()} // Block ESC key
            showCloseButton={false} // Hide the close button
          >
            <DialogHeader>
              <DialogTitle>{activeAlarm?.label || "Alarm"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Video feed */}
              <div className="relative bg-neutral-800 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>EAR: {earValue.toFixed(3)}</span>
                </div>
              </div>

              {/* Status indicator */}
              <div className={`text-center py-4 rounded-lg ${isAwake ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                <p className="text-sm font-medium">
                  {isAwake ? '👁️ Eyes detected - You can dismiss the alarm' : '😴 Open your eyes to dismiss the alarm'}
                </p>
              </div>

              {/* Alarm time */}
              <div className="text-center py-4">
                <p className="text-5xl font-bold">{activeAlarm?.time}</p>
              </div>
            </div>

            <DialogFooter className="flex justify-between gap-3">
              <Button 
                onClick={snoozeAlarm} 
                disabled={!isAwake}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Snooze 5 min
              </Button>
              <Button 
                onClick={stopAlarm} 
                disabled={!isAwake}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Stop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}