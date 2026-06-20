"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  HardDrive,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Trash2,
  FileVideo,
  Loader2,
} from "lucide-react";
import { useStorageStore } from "@/store/useStorageStore";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatFileSize } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function StoragePage() {
  const { storageInfo, uploadQueue, isLoaded, loadStorage, retryUpload, clearCompleted } =
    useStorageStore();

  useEffect(() => {
    loadStorage();
    const interval = setInterval(() => {
      loadStorage();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadStorage]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const usagePercent = (storageInfo.usedBytes / storageInfo.totalBytes) * 100;
  const completedCount = storageInfo.uploadedCount;
  const failedCount = storageInfo.failedCount;
  const uploadingCount = storageInfo.uploadingCount;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Penyimpanan</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola penyimpanan lokal dan status sinkronisasi cloud</p>
      </motion.div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Usage Gauge */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <HardDrive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Penyimpanan Lokal</h2>
                <p className="text-xs text-muted-foreground">Ruang penyimpanan perangkat</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut Chart */}
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="stroke-emerald-500"
                    strokeDasharray={`${usagePercent * 2.51} ${251.2 - usagePercent * 2.51}`}
                    initial={{ strokeDasharray: "0 251.2" }}
                    animate={{
                      strokeDasharray: `${usagePercent * 2.51} ${251.2 - usagePercent * 2.51}`,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{Math.round(usagePercent)}%</span>
                  <span className="text-xs text-muted-foreground">Terpakai</span>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Terpakai</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatFileSize(storageInfo.usedBytes)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tersedia</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatFileSize(storageInfo.totalBytes - storageInfo.usedBytes)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Kapasitas</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatFileSize(storageInfo.totalBytes)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Total File</span>
                  <span className="text-sm font-bold text-foreground">{storageInfo.fileCount} file</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="space-y-4">
          {[
            {
              label: "Mengupload",
              value: uploadingCount,
              icon: CloudUpload,
              color: "from-blue-500 to-indigo-600",
              shadow: "shadow-blue-500/20",
            },
            {
              label: "Berhasil",
              value: completedCount,
              icon: CheckCircle2,
              color: "from-emerald-500 to-teal-600",
              shadow: "shadow-emerald-500/20",
            },
            {
              label: "Gagal",
              value: failedCount,
              icon: AlertCircle,
              color: "from-red-500 to-rose-600",
              shadow: "shadow-red-500/20",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.label}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </motion.div>
      </div>

      {/* Upload Queue */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <CloudUpload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Antrian Upload</h2>
                <p className="text-xs text-muted-foreground">{uploadQueue.length} file dalam antrian</p>
              </div>
            </div>
            {completedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted} icon={<Trash2 className="w-4 h-4" />}>
                Bersihkan Selesai
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {uploadQueue.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <FileVideo className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-sm font-semibold text-foreground truncate">
                      {item.fileName}
                    </p>
                    {item.status === "uploading" && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(item.fileSize)}</span>
                    {item.status === "uploading" && <span>{item.progress}%</span>}
                  </div>
                  {item.status === "uploading" && (
                    <ProgressBar value={item.progress} size="sm" color="blue" className="mt-2" />
                  )}
                </div>

                {/* Status / Action */}
                <div className="shrink-0">
                  {item.status === "completed" ? (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-semibold">Selesai</span>
                    </div>
                  ) : item.status === "failed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryUpload(item.id)}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Retry
                    </Button>
                  ) : item.status === "queued" ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-semibold">Antrian</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-blue-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-semibold">Upload</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {uploadQueue.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Semua file sudah tersinkronisasi!</p>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

    </motion.div>
  );
}
