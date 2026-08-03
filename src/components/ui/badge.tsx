import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider w-fit whitespace-nowrap shrink-0 transition-colors duration-150",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        muted: "bg-muted text-muted-foreground",
        ai: "bg-muted text-muted-foreground",
        human: "bg-success-soft text-success-foreground",
        csv: "bg-muted text-foreground",
        flag: "bg-flag-soft text-flag-foreground",
        gap: "bg-gap text-white",
        override: "bg-override text-white",
        success: "bg-success text-white",
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
