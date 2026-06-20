"use client";

import { useEffect, useCallback } from "react";
import { useReturnStore } from "@/store/useReturnStore";
import { motion } from "framer-motion";
import {
  ScanLine,
  TrendingUp,
  TrendingDown,
  CloudUpload,
  CheckCircle2,
  ArrowRight,
  Package,
  Clock,
} from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { getRelativeTime, getCourierColor, getStatusColor, getStatusLabel } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { returns, isLoaded, loadReturns, loadStats, stats: statsData, getTodayCount, getPendingUploadCount, getSuccessRate } =
    useReturnStore();

  const loadData = useCallback(async () => {
    await Promise.all([loadReturns(), loadStats()]);
  }, [loadReturns, loadStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayCount = getTodayCount();
  const pendingCount = getPendingUploadCount();
  const successRate = getSuccessRate();
  const dailyStats = statsData?.weeklyStats || [];
  const maxStat = Math.max(...dailyStats.map((s) => s.count), 1);
  const recentReturns = returns.slice(0, 8);

  const trends = statsData?.trends;

  const statCards = [
    {
      label: "Scan Hari Ini",
      value: todayCount,
      icon: ScanLine,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/20",
      trend: trends?.today || null,
    },
    {
      label: "Menunggu Upload",
      value: pendingCount,
      icon: CloudUpload,
      color: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/20",
      trend: null,
    },
    {
      label: "Total Retur",
      value: returns.length,
      icon: Package,
      color: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
      trend: trends?.total || null,
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: CheckCircle2,
      color: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/20",
      trend: trends?.successRate || null,
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selamat datang kembali! Berikut ringkasan aktivitas hari ini.
          </p>
        </div>
        <Link href="/scan">
          <Button size="lg" icon={<ScanLine className="w-5 h-5" />}>
            Mulai Unboxing
          </Button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={i} hover>
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {stat.trend && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      stat.trend.startsWith("-")
                        ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                        : stat.trend === "0%"
                        ? "text-muted-foreground bg-muted"
                        : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                    }`}
                  >
                    {stat.trend.startsWith("-") ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3" />
                    )}
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </GlassCard>
          );
        })}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Chart - Weekly Stats */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-foreground">Aktivitas Mingguan</h2>
                <p className="text-xs text-muted-foreground mt-0.5">7 hari terakhir</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Total Scan
              </div>
            </div>
            <div className="flex items-end gap-2 lg:gap-3 h-40">
              {dailyStats.map((stat, i) => {
                const height = (stat.count / maxStat) * 100;
                const day = new Date(stat.date).toLocaleDateString("id-ID", { weekday: "short" });
                const isToday = i === dailyStats.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-xs font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {stat.count}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className={`w-full rounded-lg transition-colors ${
                        isToday
                          ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20"
                          : "bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50"
                      }`}
                      style={{ minHeight: "8px" }}
                    />
                    <span
                      className={`text-xs ${
                        isToday ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <GlassCard className="h-full">
            <h2 className="font-semibold text-foreground mb-4">Aksi Cepat</h2>
            <div className="space-y-3">
              <Link href="/scan" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30 hover:shadow-md transition-shadow group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <ScanLine className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">Mulai Unboxing</p>
                    <p className="text-xs text-muted-foreground">Scan resi & rekam video</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link href="/history" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">Lihat Riwayat</p>
                    <p className="text-xs text-muted-foreground">{returns.length} retur tercatat</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link href="/storage" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                    <CloudUpload className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">Upload Status</p>
                    <p className="text-xs text-muted-foreground">{pendingCount} menunggu</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Scans */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Scan Terbaru</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Retur terakhir yang tercatat</p>
            </div>
            <Link href="/history">
              <Button variant="ghost" size="sm">
                Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Table (desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">No. Resi</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Kurir</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Waktu</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">Upload</th>
                </tr>
              </thead>
              <tbody>
                {recentReturns.map((ret) => (
                  <tr key={ret.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <Link href={`/history/${ret.id}`} className="font-mono text-sm font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                        {ret.receiptNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={ret.courierName} colorClass={getCourierColor(ret.courierName)} label={ret.courierName} />
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{getRelativeTime(ret.scannedAt)}</td>
                    <td className="py-3 px-2">
                      <StatusBadge
                        status={ret.media.uploadStatus}
                        colorClass={getStatusColor(ret.media.uploadStatus)}
                        label={getStatusLabel(ret.media.uploadStatus)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden space-y-2">
            {recentReturns.slice(0, 5).map((ret) => (
              <Link key={ret.id} href={`/history/${ret.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-foreground truncate">{ret.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">{ret.courierName} · {getRelativeTime(ret.scannedAt)}</p>
                  </div>
                  <StatusBadge
                    status={ret.media.uploadStatus}
                    colorClass={getStatusColor(ret.media.uploadStatus)}
                    label={getStatusLabel(ret.media.uploadStatus)}
                  />
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
