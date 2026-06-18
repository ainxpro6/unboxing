"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  size?: "sm" | "md" | "lg";
  color?: "emerald" | "blue" | "amber" | "red";
  showLabel?: boolean;
}

const colorMap = {
  emerald: "from-emerald-400 to-emerald-600",
  blue: "from-blue-400 to-blue-600",
  amber: "from-amber-400 to-amber-600",
  red: "from-red-400 to-red-600",
};

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export default function ProgressBar({
  value,
  className,
  size = "md",
  color = "emerald",
  showLabel = false,
}: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeMap[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            colorMap[color]
          )}
        />
      </div>
      {showLabel && (
        <div className="flex justify-end mt-1">
          <span className="text-xs text-muted-foreground font-medium">{Math.round(value)}%</span>
        </div>
      )}
    </div>
  );
}
