import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-none border-2 border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
