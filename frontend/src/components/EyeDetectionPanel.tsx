"use client";

import { useEffect, useRef } from "react";
import { Eye } from "lucide-react";

interface EyeDetectionPanelProps {
  modelsLoaded: boolean;
  isActive: boolean;
  earValue: number;
  onEarChange: (ear: number) => void;
  onAwakeChange: (awake: boolean) => void;
}

export default function EyeDetectionPanel({ modelsLoaded, isActive, earValue, onEarChange, onAwakeChange }: EyeDetectionPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const EAR_THRESHOLD = 0.28;

  useEffect(() => {
    if (!isActive || !modelsLoaded) return;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          // Stop any existing stream before assigning a new one
          if (videoRef.current.srcObject) {
            try {
              (videoRef.current.srcObject as MediaStream)
                .getTracks()
                .forEach((t) => t.stop());
            } catch {}
          }
          videoRef.current.srcObject = stream;
          const onLoaded = () => {
            videoRef.current?.play().catch(() => {});
            startEyeDetection();
          };
          videoRef.current.onloadedmetadata = onLoaded;
        }
      })
      .catch((err) => console.error("Camera error:", err));

    return () => stopVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, modelsLoaded]);

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
    onAwakeChange(false);
    onEarChange(0);
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
            onEarChange(avgEAR);
            onAwakeChange(avgEAR > EAR_THRESHOLD);
          }
        } else {
          onAwakeChange(false);
          onEarChange(0);
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

  return (
    <div className="relative bg-neutral-800 rounded-lg overflow-hidden">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-48 object-cover" />
      <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full text-xs flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>EAR: {earValue.toFixed(3)}</span>
      </div>
    </div>
  );
}


