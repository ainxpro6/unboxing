"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Settings,
  HardDrive,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/store/useSidebarStore";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Mulai Scan", href: "/scan", icon: ScanLine },
  { label: "Riwayat", href: "/history", icon: History },
  { label: "Pengaturan", href: "/settings", icon: Settings },
  { label: "Penyimpanan", href: "/storage", icon: HardDrive },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [hoveredTop, setHoveredTop] = useState<number | null>(null);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 transition-all duration-300 ease-in-out",
        "bg-sidebar border-r border-border",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 h-16 border-b border-border shrink-0 transition-all duration-300",
          collapsed ? "justify-center px-4" : "px-5"
        )}
      >
        <img
          src="/icon-512.png"
          alt="Logo"
          className="w-9 h-9 object-contain rounded-xl shrink-0"
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="font-bold text-lg text-foreground tracking-tight">
                Unboxing
              </h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Retur Manager</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={(e) => {
                if (collapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredLabel(item.label);
                  setHoveredTop(rect.top + rect.height / 2);
                }
              }}
              onMouseLeave={() => {
                setHoveredLabel(null);
                setHoveredTop(null);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-3 border-t border-border shrink-0">
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center w-full py-2 rounded-xl text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      {collapsed && hoveredLabel && hoveredTop !== null && (
        <div
          style={{ top: `${hoveredTop}px` }}
          className="fixed left-[80px] -translate-y-1/2 px-2.5 py-1.5 bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 text-xs font-medium rounded-lg shadow-md pointer-events-none z-50 whitespace-nowrap"
        >
          {hoveredLabel}
        </div>
      )}
    </aside>
  );
}
