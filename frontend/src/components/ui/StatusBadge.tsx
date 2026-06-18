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
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide",
        colorClass
      )}
    >
      {label}
    </span>
  );
}
