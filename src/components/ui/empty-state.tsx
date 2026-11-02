import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#E4E0D8] bg-[#F1EEE8]/40 my-6",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-[#FFFFFF] p-3 text-[#5B6472] shadow-sm border border-[#E4E0D8]">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base font-bold text-[#0B0D10]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[#5B6472] leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
