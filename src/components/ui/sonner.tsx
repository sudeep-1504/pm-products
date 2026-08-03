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
            "group toast rounded-none border-2 border-foreground bg-background text-foreground font-mono text-sm",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
