"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Bell, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Script from "next/script";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AddAlarmForm from "./AddAlarmForm";
import AlarmItem from "./AlarmItem";
import EyeDetectionPanel from "./EyeDetectionPanel";
import QuestionChallenge from "./QuestionChallenge";

declare global {
  interface Window {
    faceapi: {
      nets: {
        tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> };
        faceLandmark68Net: { loadFromUri: (uri: string) => Promise<void> };
      };
      TinyFaceDetectorOptions: any;
      detectAllFaces: (video: HTMLVideoElement, options?: any) => any;
    };
  }
}

interface Alarm {
  _id: Id<"alarms">;
  time: string;
  label: string;
  enabled: boolean;
  triggered?: boolean;
  lastTriggered?: string;
}

interface Question {
  question: string;
  answer: string;
}

export default function AlarmsPanel() {
  // Convex queries
  const alarms = useQuery(api.alarm.getAlarms) ?? [];

  // Convex mutations
  const createAlarm = useMutation(api.alarm.createAlarm);
  const deleteAlarmMutation = useMutation(api.alarm.deleteAlarm);
  const toggleAlarmEnabled = useMutation(api.alarm.toggleAlarmEnabled);
  const editAlarm = useMutation(api.alarm.editAlarm);
  const markLastTriggeredMutation = useMutation(api.alarm.markLastTriggered);

  // Local UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlarmTime, setNewAlarmTime] = useState("");
  const [newAlarmLabel, setNewAlarmLabel] = useState("");
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [isAwake, setIsAwake] = useState(false);
  const [earValue, setEarValue] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [answerCorrect, setAnswerCorrect] = useState(false);
  const [showError, setShowError] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

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
        await window.faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await window.faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        console.log("Face detection models loaded");
        setModelsLoaded(true);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };
    if (typeof window !== "undefined" && window.faceapi) {
      loadModels();
    }
  }, []);

  // Start video and fetch question when alarm triggers
  useEffect(() => {
    if (activeAlarm && modelsLoaded) {
      startVideo();
      fetchQuestion();
    } else if (!activeAlarm) {
      stopVideo();
      setQuestion(null);
      setUserAnswer("");
      setAnswerCorrect(false);
      setShowError(false);
    }
  }, [activeAlarm, modelsLoaded]);

  const fetchQuestion = async () => {
    setLoadingQuestion(true);
    try {
      const response = await fetch("/api/get-question");
      const data = await response.json();
      setQuestion(data);
    } catch (error) {
      console.error("Error fetching question:", error);
      setQuestion({ question: "What is the capital of France?", answer: "Paris" });
    } finally {
      setLoadingQuestion(false);
    }
  };

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startEyeDetection();
        }
      })
      .catch((err) => console.error("Camera error:", err));
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
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
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
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
        console.error("Detection error:", error);
      }
    }, 300);
  };

  const euclideanDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

  const getEAR = (eye: Array<{ x: number; y: number }>) => {
    const A = euclideanDistance(eye[1], eye[5]);
    const B = euclideanDistance(eye[2], eye[4]);
    const C = euclideanDistance(eye[0], eye[3]);
    return (A + B) / (2.0 * C);
  };

  // Alarm loop
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
      if (alarm.enabled && alarm.time === currentTimeStr && alarm.lastTriggered !== currentTimeStr) {
        triggerAlarm(alarm, currentTimeStr);
      }
    });
  };

  const triggerAlarm = (alarm: Alarm, currentTimeStr: string) => {
    setActiveAlarm(alarm);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio("/alarm.mp3");
    audio.loop = true;
    audio.play().catch(() => {});
    audioRef.current = audio;
    markLastTriggeredMutation({ id: alarm._id, lastTriggered: currentTimeStr });
  };

  const stopAlarm = () => {
    if (!isAwake || !answerCorrect) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setActiveAlarm(null);
  };

  const snoozeAlarm = () => {
    if (!isAwake || !answerCorrect || !activeAlarm) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const [hours, minutes] = activeAlarm.time.split(":").map(Number);
    const snoozeDate = new Date();
    snoozeDate.setHours(hours, minutes + 5, 0, 0);
    const snoozeTime = snoozeDate.toTimeString().slice(0, 5);
    editAlarm({ id: activeAlarm._id, time: snoozeTime });
    setActiveAlarm(null);
  };

  const deleteAlarm = async (id: Id<"alarms">) => {
    await deleteAlarmMutation({ id });
  };

  const toggleAlarm = async (id: Id<"alarms">) => {
    await toggleAlarmEnabled({ id });
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
            <AddAlarmForm
              onSave={async (time, label) => {
                await createAlarm({ time, label });
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
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
                <AlarmItem
                  key={alarm._id}
                  alarm={alarm}
                  index={index}
                  onToggle={toggleAlarm}
                  onDelete={deleteAlarm}
                />
              ))
            )}
          </div>
        </div>

        {/* Alarm Dialog */}
        <Dialog open={!!activeAlarm} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{activeAlarm?.label || "Alarm"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <EyeDetectionPanel
                modelsLoaded={modelsLoaded}
                isActive={!!activeAlarm}
                earValue={earValue}
                onEarChange={setEarValue}
                onAwakeChange={setIsAwake}
              />
              <div
                className={`text-center py-3 rounded-lg ${
                  isAwake ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                }`}
              >
                <p className="text-sm font-medium">{isAwake ? "✓ Eyes Open" : "✗ Open your eyes"}</p>
              </div>
              <QuestionChallenge onCorrect={() => setAnswerCorrect(true)} />
              <div className="text-center py-4">
                <p className="text-5xl font-bold">{activeAlarm?.time}</p>
              </div>
            </div>
            <DialogFooter className="flex justify-between gap-3">
              <Button
                onClick={snoozeAlarm}
                disabled={!isAwake || !answerCorrect}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
              >
                Snooze 5 min
              </Button>
              <Button
                onClick={stopAlarm}
                disabled={!isAwake || !answerCorrect}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
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