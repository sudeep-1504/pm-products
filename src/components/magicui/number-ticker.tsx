"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  startValue?: number;
  decimalPlaces?: number;
  className?: string;
  delay?: number;
}

// Animates a static number into a settled count-up/down on mount — a small,
// one-time flourish for score/rank displays, not a constantly-moving effect.
export function NumberTicker({ value, startValue = 0, decimalPlaces = 0, className, delay = 0 }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(startValue);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (!isInView) return;
    const timer = setTimeout(() => motionValue.set(value), delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, isInView, delay, value]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (!ref.current) return;
        ref.current.textContent = Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)));
      }),
    [springValue, decimalPlaces]
  );

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      {startValue.toFixed(decimalPlaces)}
    </span>
  );
}
