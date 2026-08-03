import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm outline-none transition-all duration-150 ease-out placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-40 hover:border-foreground/30",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
