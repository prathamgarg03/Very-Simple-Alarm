'use client'
import { useEffect, useRef } from "react"
import Script from "next/script"

// Let TS know faceapi exists
// @ts-ignore
declare var faceapi: any

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
      startVideo()
    }

    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch(err => console.error("Error accessing webcam:", err))
    }

    const checkAwake = async () => {
      if (!videoRef.current) return
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()

      if (detections.length > 0) {
        const landmarks = detections[0].landmarks
        const leftEAR = getEAR(landmarks.getLeftEye())
        const rightEAR = getEAR(landmarks.getRightEye())
        const avgEAR = (leftEAR + rightEAR) / 2

        if (avgEAR > 0.3) {
          console.log("✅ User is AWAKE (eyes fully open)")
        } else {
          console.log("❌ User is NOT fully awake")
        }
      }
    }

    function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
    }

    function getEAR(eye: { x: number; y: number }[]) {
      const A = euclideanDistance(eye[1], eye[5])
      const B = euclideanDistance(eye[2], eye[4])
      const C = euclideanDistance(eye[0], eye[3])
      return (A + B) / (2.0 * C)
    }

    loadModels()
    const interval = setInterval(checkAwake, 300)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Script src="/face-api.min.js" strategy="beforeInteractive" />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <video ref={videoRef} width="720" height="560" autoPlay muted />
      </div>
    </>
  )
}
