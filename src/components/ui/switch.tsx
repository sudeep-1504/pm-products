"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center border-2 border-foreground bg-background transition-colors data-[state=checked]:bg-foreground disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3.5 translate-x-0.5 bg-foreground transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-background" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
