"use client";

import { useRef } from "react";
import { motion, useInView, type Variants } from "motion/react";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  yOffset?: number;
  blur?: string;
  inViewMargin?: `${number}px`;
}

// Staggered entrance: fade + slight blur + small y-offset settling into place.
// Used for list rows/cards on first render so content doesn't just pop in.
export function BlurFade({
  children,
  className,
  duration = 0.35,
  delay = 0,
  yOffset = 6,
  blur = "4px",
  inViewMargin = "-40px",
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: inViewMargin });

  const variants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: 0, opacity: 1, filter: "blur(0px)" },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
