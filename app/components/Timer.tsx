'use client';
import { useEffect, useState } from 'react';

export default function Timer({ startedAt, endedAt }: { startedAt: string; endedAt?: string }) {
  const [elapsed, setElapsed] = useState(() => {
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    return Math.floor((end - start) / 1000);
  });

  useEffect(() => {
    if (endedAt) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [endedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="px-4 bg-white text-black font-bold text-sm  hover:bg-amber-300 transition">
      ⏱ {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>



  );
}
