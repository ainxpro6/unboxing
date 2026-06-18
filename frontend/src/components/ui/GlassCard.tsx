"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className, hover = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={hover ? { y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" } : undefined}
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-2xl p-4 sm:p-5 transition-colors duration-200",
        hover && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
