import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider w-fit whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        default: "border-foreground text-foreground bg-transparent",
        muted: "border-border text-muted-foreground bg-muted",
        ai: "border-foreground/40 text-muted-foreground bg-transparent",
        human: "border-success text-success bg-transparent",
        csv: "border-foreground text-foreground bg-transparent",
        flag: "border-flag text-flag bg-transparent",
        gap: "border-gap text-gap-foreground bg-gap",
        override: "border-override text-override-foreground bg-override",
        success: "border-success text-success-foreground bg-success",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
