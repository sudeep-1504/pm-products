import React, { type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

// A button with a continuously travelling light sweep around its border.
// Reserved for the one primary action per screen (e.g. "Commit rank") so it
// reads as emphasis rather than noise.
export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "2.5s",
      borderRadius = "0.5rem",
      background = "var(--color-foreground)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap px-4 py-2 text-sm font-medium text-background",
          "[background:var(--bg)] [border-radius:var(--radius)]",
          "transform-gpu transition-transform duration-150 ease-out active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* shimmer layer */}
        <div className="absolute inset-0 -z-30 overflow-visible [container-type:size]">
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0]">
            <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
          </div>
        </div>

        {children}

        {/* backdrop that keeps the fill color while letting the shimmer peek through the edges */}
        <div className="absolute [inset:var(--cut)] -z-20 [background:var(--bg)] [border-radius:var(--radius)]" />
      </button>
    );
  }
);
ShimmerButton.displayName = "ShimmerButton";
