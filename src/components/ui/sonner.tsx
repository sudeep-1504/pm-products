"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-lg border border-border bg-background text-foreground font-mono text-sm shadow-lg shadow-foreground/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
