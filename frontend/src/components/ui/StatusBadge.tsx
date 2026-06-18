"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  colorClass: string;
  label: string;
}

export default function StatusBadge({ colorClass, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide whitespace-nowrap",
        colorClass
      )}
    >
      {label}
    </span>
  );
}
