'use client';

import { useEffect, useState } from 'react';

export default function DistanceSensor() {
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDistance = async () => {
      try {
        const res = await fetch('http://localhost:3001/distance');
        const data = await res.json();
        setDistance(data.distance);
        setError(null);
      } catch (err) {
        setError('Failed to connect to serial server');
        console.error(err);
      }
    };

    fetchDistance();
    const interval = setInterval(fetchDistance, 100); // Poll every 100ms

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="text-4xl font-bold">
      Distance: {distance !== null ? `${distance} cm` : '—'}
    </div>
  );
}