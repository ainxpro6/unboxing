"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  icon?: ReactNode;
}

const variants = {
  primary:
    "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98]",
  secondary:
    "bg-muted text-foreground hover:bg-surface-hover active:scale-[0.98]",
  outline:
    "border border-border text-foreground hover:bg-muted active:scale-[0.98]",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98]",
  danger:
    "bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 active:scale-[0.98]",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-4 py-2 text-xs sm:text-sm rounded-xl gap-1.5 sm:gap-2 sm:px-5 sm:py-2.5",
  xl: "px-4 py-2.5 text-sm rounded-xl gap-2 sm:px-6 sm:py-3 sm:text-base sm:rounded-2xl sm:gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  icon,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
