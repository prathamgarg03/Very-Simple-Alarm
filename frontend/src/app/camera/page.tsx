// 'use client'
// import { useEffect, useRef } from "react"
// import Script from "next/script"

// // Let TS know faceapi exists
// // @ts-ignore
// declare var faceapi: any

// export default function Home() {
//   const videoRef = useRef<HTMLVideoElement | null>(null)

//   useEffect(() => {
//     const loadModels = async () => {
//       await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
//       await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
//       startVideo()
//     }

//     const startVideo = () => {
//       navigator.mediaDevices.getUserMedia({ video: true })
//         .then(stream => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream
//           }
//         })
//         .catch(err => console.error("Error accessing webcam:", err))
//     }

//     const checkAwake = async () => {
//       if (!videoRef.current) return
//       const detections = await faceapi
//         .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
//         .withFaceLandmarks()

//       if (detections.length > 0) {
//         const landmarks = detections[0].landmarks
//         const leftEAR = getEAR(landmarks.getLeftEye())
//         const rightEAR = getEAR(landmarks.getRightEye())
//         const avgEAR = (leftEAR + rightEAR) / 2

//         if (avgEAR > 0.3) {
//           console.log("✅ User is AWAKE (eyes fully open)")
//         } else {
//           console.log("❌ User is NOT fully awake")
//         }
//       }
//     }

//     function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
//       return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
//     }

//     function getEAR(eye: { x: number; y: number }[]) {
//       const A = euclideanDistance(eye[1], eye[5])
//       const B = euclideanDistance(eye[2], eye[4])
//       const C = euclideanDistance(eye[0], eye[3])
//       return (A + B) / (2.0 * C)
//     }

//     loadModels()
//     const interval = setInterval(checkAwake, 300)

//     return () => clearInterval(interval)
//   }, [])

//   return (
//     <>
//       <Script src="/face-api.min.js" strategy="beforeInteractive" />
//       <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
//         <video ref={videoRef} width="720" height="560" autoPlay muted />
//       </div>
//     </>
//   )
// }

'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

/* eslint-disable @typescript-eslint/no-explicit-any */
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
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function AwakenessDebug() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [earValues, setEarValues] = useState({ left: 0, right: 0, avg: 0 })
  const [isAwake, setIsAwake] = useState(false)
  
  // TUNE THIS VALUE based on your testing
  const EAR_THRESHOLD = 0.28

  useEffect(() => {
    const loadModels = async () => {
      if (!window.faceapi) return
      
      await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      await window.faceapi.nets.faceLandmark68Net.loadFromUri('/models')
      
      console.log('Models loaded')
      startVideo()
    }

    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch(err => console.error('Camera error:', err))
    }

    const checkAwake = async () => {
      if (!videoRef.current) return

      try {
        const detections = await window.faceapi
          .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()

        if (detections.length > 0) {
          const landmarks = detections[0].landmarks
          const leftEye = landmarks.getLeftEye()
          const rightEye = landmarks.getRightEye()
          
          // Debug: Check if we're getting 6 points per eye
          if (leftEye.length !== 6 || rightEye.length !== 6) {
            console.error('Eye landmarks incorrect!', leftEye.length, rightEye.length)
            return
          }
          
          const leftEAR = getEAR(leftEye)
          const rightEAR = getEAR(rightEye)
          const avgEAR = (leftEAR + rightEAR) / 2

          // Update state for display
          setEarValues({ left: leftEAR, right: rightEAR, avg: avgEAR })
          setIsAwake(avgEAR > EAR_THRESHOLD)

          // Console log for debugging
          console.log(
            `EAR - Left: ${leftEAR.toFixed(3)}, Right: ${rightEAR.toFixed(3)}, Avg: ${avgEAR.toFixed(3)} | ` +
            `Threshold: ${EAR_THRESHOLD} | Awake: ${avgEAR > EAR_THRESHOLD}`
          )
        } else {
          console.log('No face detected')
        }
      } catch (error) {
        console.error('Detection error:', error)
      }
    }

    const euclideanDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
    }

    const getEAR = (eye: Array<{ x: number; y: number }>) => {
      const A = euclideanDistance(eye[1], eye[5])
      const B = euclideanDistance(eye[2], eye[4])
      const C = euclideanDistance(eye[0], eye[3])
      
      const ear = (A + B) / (2.0 * C)
      
      // Debug: Check if calculation seems reasonable
      if (ear > 0.5 || ear < 0.1) {
        console.warn('Unusual EAR value:', ear)
      }
      
      return ear
    }

  // Only start detection loop on the client after mount
  setMounted(true)
  loadModels()
  const interval = setInterval(checkAwake, 300)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Script src="/face-api.min.js" strategy="beforeInteractive" />
      
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="mb-4 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">
            {isAwake ? '👁️ EYES OPEN' : '😴 EYES CLOSED'}
          </h1>
          <div className="text-xl">
            Threshold: {EAR_THRESHOLD}
          </div>
        </div>

        {/* Real-time EAR values */}
        <div className="mb-4 grid grid-cols-3 gap-4 text-white">
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-gray-400 text-sm">Left EAR</div>
            <div className="text-2xl font-bold">{earValues.left.toFixed(3)}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-gray-400 text-sm">Right EAR</div>
            <div className="text-2xl font-bold">{earValues.right.toFixed(3)}</div>
          </div>
          <div className={`p-4 rounded ${isAwake ? 'bg-green-600' : 'bg-red-600'}`}>
            <div className="text-white text-sm">Average EAR</div>
            <div className="text-2xl font-bold">{earValues.avg.toFixed(3)}</div>
          </div>
        </div>

        {/* Only render the video element after client mount to avoid
            attribute mismatches introduced by browser extensions or
            other client-side modifications during hydration. */}
        {mounted ? (
          <video
            ref={videoRef}
            width="640"
            height="480"
            autoPlay
            muted
            className="rounded-lg"
            suppressHydrationWarning
          />
        ) : (
          // server-side placeholder with same layout to avoid layout shift
          <div style={{ width: 640, height: 480 }} />
        )}
      </div>
    </>
  )
}
