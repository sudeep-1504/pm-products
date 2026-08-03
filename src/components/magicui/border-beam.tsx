"use client";

import { motion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  reverse?: boolean;
}

// A light trail that travels the perimeter of a rounded container (relies on
// `rounded-[inherit]` — the parent must be `relative` and already rounded).
// Used sparingly: one highlight on the page at a time (e.g. the top-ranked
// row), not decoration on every card.
export function BorderBeam({
  className,
  size = 60,
  duration = 8,
  delay = 0,
  colorFrom = "var(--color-foreground)",
  colorTo = "transparent",
  transition,
  reverse = false,
}: BorderBeamProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <motion.div
        className={cn("absolute aspect-square bg-gradient-to-l from-(--color-from) via-(--color-to) to-transparent", className)}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
          } as React.CSSProperties
        }
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: reverse ? ["100%", "0%"] : ["0%", "100%"] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
}
