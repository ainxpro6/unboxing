"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useSidebarStore } from "@/store/useSidebarStore";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebarStore();

  return (
    <>
      <Sidebar />
      <div
        className={cn(
          "flex flex-col flex-1 transition-all duration-300 overflow-x-hidden",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        <Header />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  );
}

