import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-none border-2 border-border bg-background px-3 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Input };
