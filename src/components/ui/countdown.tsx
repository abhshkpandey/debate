"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetDate: string | Date;
  onComplete?: () => void;
  className?: string;
  label?: string;
}

export function Countdown({
  targetDate,
  onComplete,
  className,
  label,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  useEffect(() => {
    function calculate() {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        if (onComplete) onComplete();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isPast: false });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-lg bg-[#0B0D10] text-[#FFFFFF] px-4 py-2 border border-[#E4E0D8]",
        className
      )}
    >
      {label && (
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#C7F36B] mb-1">
          {label}
        </span>
      )}
      <div className="font-mono text-xl font-extrabold tracking-wider text-[#FFFFFF]">
        {timeLeft.isPast ? (
          <span className="text-[#D93A47]">TIME EXPIRED</span>
        ) : (
          <>
            {timeLeft.hours > 0 && <span>{pad(timeLeft.hours)}:</span>}
            <span>{pad(timeLeft.minutes)}:</span>
            <span className="text-[#C7F36B]">{pad(timeLeft.seconds)}</span>
          </>
        )}
      </div>
    </div>
  );
}
