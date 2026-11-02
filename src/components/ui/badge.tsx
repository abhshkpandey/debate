import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#F1EEE8] text-[#0B0D10] border border-[#E4E0D8]",
        open: "bg-[#C7F36B] text-[#0B0D10] border border-[#aee24b]",
        scheduled: "bg-[#6B5CE6] text-[#FFFFFF]",
        in_progress: "bg-[#D93A47] text-[#FFFFFF] animate-pulse",
        completed: "bg-[#1F9D61] text-[#FFFFFF]",
        cancelled: "bg-[#E4E0D8] text-[#5B6472]",
        danger: "bg-[#D93A47] text-[#FFFFFF]",
        outline: "text-[#0B0D10] border border-[#E4E0D8]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
