'use client';

import { useEffect, useState } from 'react';
import { getDistance } from '@/actions/serial';

export default function DistanceSensor() {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const dist = await getDistance();
      setDistance(dist);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-2xl font-bold">
      Distance: {distance ?? '—'} cm
    </div>
  );
}