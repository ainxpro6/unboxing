"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Camera,
  Video,
  CloudUpload,
  CheckCircle2,
  Clock,
  Trash2,
  Download,
  RotateCcw,
  Copy,
  Check,
  Image,
  Film,
} from "lucide-react";
import { useReturnStore } from "@/store/useReturnStore";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import {
  formatDateTime,
  formatDuration,
  getCourierColor,
  getStatusColor,
  getStatusLabel,
  getBarangStatusColor,
  getBarangStatusLabel,
} from "@/lib/utils";

const timelineSteps = [
  { key: "scanned", label: "Resi Dipindai", icon: Package },
  { key: "photo", label: "Foto Diambil", icon: Camera },
  { key: "video", label: "Video Direkam", icon: Video },
  { key: "uploaded", label: "Diupload", icon: CloudUpload },
];

export default function ReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { returns, isLoaded, loadReturns, deleteReturn } = useReturnStore();
  const [copied, setCopied] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const getMediaUrl = (cloudUrl: string | null) => {
    return cloudUrl || "";
  };

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const returnItem = returns.find((r) => r.id === params.id);

  const copyResi = () => {
    if (returnItem) {
      navigator.clipboard.writeText(returnItem.receiptNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    if (returnItem) {
      deleteReturn(returnItem.id);
      router.push("/history");
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!returnItem) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Data Tidak Ditemukan</h2>
        <p className="text-muted-foreground mb-6">Retur dengan ID ini tidak ditemukan.</p>
        <Button variant="outline" onClick={() => router.push("/history")}>
          Kembali ke Riwayat
        </Button>
      </div>
    );
  }

  const getTimelineStatus = (key: string) => {
    switch (key) {
      case "scanned":
        return true;
      case "photo":
        return !!returnItem.media.photoLocalPath;
      case "video":
        return !!returnItem.media.videoLocalPath;
      case "uploaded":
        return returnItem.media.uploadStatus === "uploaded";
      default:
        return false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Back button */}
      <button
        onClick={() => router.push("/history")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Riwayat
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold font-mono text-foreground">
                  {returnItem.receiptNumber}
                </h1>
                <button
                  onClick={copyResi}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge
                  status={returnItem.courierName}
                  colorClass={getCourierColor(returnItem.courierName)}
                  label={returnItem.courierName}
                />
                <StatusBadge
                  status={returnItem.statusBarang}
                  colorClass={getBarangStatusColor(returnItem.statusBarang)}
                  label={getBarangStatusLabel(returnItem.statusBarang)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            icon={<Download className="w-4 h-4" />}
            onClick={() => {
              if (returnItem.media.photoCloudUrl && returnItem.media.photoDriveFileId) {
                const a = document.createElement("a");
                a.href = `https://drive.google.com/uc?export=download&id=${returnItem.media.photoDriveFileId}`;
                a.download = returnItem.media.photoLocalPath || `${returnItem.receiptNumber}_resi.jpg`;
                a.target = "_blank";
                a.click();
              }
              if (returnItem.media.videoCloudUrl && returnItem.media.videoDriveFileId) {
                setTimeout(() => {
                  const a = document.createElement("a");
                  a.href = `https://drive.google.com/uc?export=download&id=${returnItem.media.videoDriveFileId}`;
                  a.download = returnItem.media.videoLocalPath || `${returnItem.receiptNumber}_unboxing.webm`;
                  a.target = "_blank";
                  a.click();
                }, 100);
              }
            }}
          >
            Download
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)} icon={<Trash2 className="w-4 h-4" />}>
            Hapus
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Media Preview */}
          <GlassCard>
            <h2 className="font-semibold text-foreground mb-4">Media</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo */}
              <div className="rounded-xl overflow-hidden border border-border bg-muted/50">
                {returnItem.media.photoCloudUrl ? (
                  <div className="aspect-[4/3] relative group bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getMediaUrl(returnItem.media.photoCloudUrl)}
                      alt="Foto Resi"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center">
                    <Image className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Foto Resi</p>
                  </div>
                )}
                <div className="p-3 border-t border-border">
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {returnItem.media.photoLocalPath || `${returnItem.receiptNumber}_resi.jpg`}
                  </p>
                </div>
              </div>

              {/* Video */}
              <div className="rounded-xl overflow-hidden border border-border bg-muted/50">
                {returnItem.media.videoCloudUrl ? (
                  <div className="aspect-[4/3] relative bg-black">
                    <video
                      src={getMediaUrl(returnItem.media.videoCloudUrl)}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center relative">
                    <Film className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Video Unboxing</p>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-mono">
                      {formatDuration(returnItem.media.videoDuration)}
                    </div>
                  </div>
                )}
                <div className="p-3 border-t border-border">
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {returnItem.media.videoLocalPath || `${returnItem.receiptNumber}_unboxing.mp4`}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Timeline */}
          <GlassCard>
            <h2 className="font-semibold text-foreground mb-4">Status Timeline</h2>
            <div className="space-y-0">
              {timelineSteps.map((step, i) => {
                const isComplete = getTimelineStatus(step.key);
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isComplete
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      {i < timelineSteps.length - 1 && (
                        <div
                          className={`w-0.5 h-8 ${
                            isComplete
                              ? "bg-emerald-300 dark:bg-emerald-700"
                              : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pt-2 pb-4">
                      <p className={`text-sm font-semibold ${isComplete ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      {isComplete && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {step.key === "scanned" ? formatDateTime(returnItem.scannedAt) : "Selesai"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Info Card */}
          <GlassCard>
            <h2 className="font-semibold text-foreground mb-4">Detail Informasi</h2>
            <div className="space-y-3">
              {[
                { label: "No. Resi", value: returnItem.receiptNumber, mono: true },
                { label: "Kurir", value: returnItem.courierName },
                { label: "Waktu Scan", value: formatDateTime(returnItem.scannedAt) },
                { label: "Durasi Video", value: formatDuration(returnItem.media.videoDuration) },
                { label: "Status Barang", value: getBarangStatusLabel(returnItem.statusBarang) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-semibold text-foreground ${item.mono ? "font-mono" : ""}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Upload Status */}
          <GlassCard>
            <h2 className="font-semibold text-foreground mb-4">Status Upload</h2>
            <div className="text-center py-4">
              <StatusBadge
                status={returnItem.media.uploadStatus}
                colorClass={getStatusColor(returnItem.media.uploadStatus)}
                label={getStatusLabel(returnItem.media.uploadStatus)}
              />
              {returnItem.media.uploadStatus === "uploaded" && returnItem.media.uploadedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDateTime(returnItem.media.uploadedAt)}
                </p>
              )}
              {(returnItem.media.uploadStatus === "pending" || returnItem.media.uploadStatus === "failed") && (
                <div className="mt-4">
                  <Button size="sm" variant="outline" icon={<RotateCcw className="w-4 h-4" />}>
                    Upload Ulang
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Cloud URLs */}
          {returnItem.media.uploadStatus === "uploaded" && (
            <GlassCard>
              <h2 className="font-semibold text-foreground mb-3">Cloud URLs</h2>
              <div className="space-y-2">
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Foto</p>
                  <p className="text-xs font-mono text-foreground truncate">{returnItem.media.photoCloudUrl}</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Video</p>
                  <p className="text-xs font-mono text-foreground truncate">{returnItem.media.videoCloudUrl}</p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Hapus Retur">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-foreground mb-1">Yakin ingin menghapus data retur ini?</p>
          <p className="text-sm text-muted-foreground mb-6 font-mono">{returnItem.receiptNumber}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
