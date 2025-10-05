'use client';

import { useEffect, useState } from 'react';

interface DistanceData {
  distance: number | null;
  previousDistance: number | null;
  motionDetected: boolean;
  lastMotionTime: number | null;
}

export default function DistanceSensor() {
  const [data, setData] = useState<DistanceData>({
    distance: null,
    previousDistance: null,
    motionDetected: false,
    lastMotionTime: null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDistance = async () => {
      try {
        const res = await fetch('http://localhost:3001/distance');
        const responseData = await res.json();
        setData(responseData);
        setError(null);
      } catch (err) {
        setError('Failed to connect to serial server');
        console.error(err);
      }
    };

    fetchDistance();
    const interval = setInterval(fetchDistance, 100);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const distanceChange = data.previousDistance !== null && data.distance !== null
    ? Math.abs(data.distance - data.previousDistance)
    : 0;

  return (
    <div className="space-y-4">
      <div className="text-4xl font-bold">
        Distance: {data.distance !== null ? `${data.distance} cm` : '—'}
      </div>
      
      <div className="text-2xl">
        Previous: {data.previousDistance !== null ? `${data.previousDistance} cm` : '—'}
      </div>

      <div className="text-2xl">
        Change: {distanceChange.toFixed(1)} cm
      </div>
      
      <div className={`text-3xl font-bold ${data.motionDetected ? 'text-green-500' : 'text-gray-400'}`}>
        {data.motionDetected ? '✓ Motion Detected' : 'No Motion'}
      </div>
    </div>
  );
}