"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  LayoutGrid,
  LayoutList,
  Package,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { useReturnStore } from "@/store/useReturnStore";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import {
  formatDateTime,
  formatDuration,
  getRelativeTime,
  getCourierColor,
  getStatusColor,
  getStatusLabel,
  getBarangStatusColor,
  getBarangStatusLabel,
} from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function HistoryPage() {
  const { returns, isLoaded, loadReturns } = useReturnStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const filteredReturns = useMemo(() => {
    let result = [...returns];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.receiptNumber.toLowerCase().includes(q) ||
          r.courierName.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.media.uploadStatus === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const diff = new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime();
      return sortOrder === "desc" ? diff : -diff;
    });

    return result;
  }, [returns, searchQuery, statusFilter, sortOrder]);

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredReturns.map((r) => r.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const isAllSelected = useMemo(() => {
    if (filteredReturns.length === 0) return false;
    return filteredReturns.every((r) => selectedIds.includes(r.id));
  }, [filteredReturns, selectedIds]);

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleDownloadZip = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);
    setDownloadProgress("Menyiapkan...");

    try {
      const zip = new JSZip();
      const selectedReturns = returns.filter((r) => selectedIds.includes(r.id));

      let count = 0;
      const totalFiles = selectedReturns.reduce((acc, ret) => {
        let filesCount = 0;
        if (ret.media.photoLocalPath) filesCount++;
        if (ret.media.videoLocalPath) filesCount++;
        return acc + filesCount;
      }, 0);

      if (totalFiles === 0) {
        alert("Tidak ada file media untuk diunduh dari item terpilih.");
        setIsDownloading(false);
        return;
      }

      for (const ret of selectedReturns) {
        // Download photo if exists
        if (ret.media.photoLocalPath) {
          try {
            setDownloadProgress(`${count + 1}/${totalFiles}`);
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unboxing-media/${ret.media.photoLocalPath}`;
            const res = await fetch(url);
            if (res.ok) {
              const blob = await res.blob();
              zip.file(`${ret.receiptNumber}_resi.jpg`, blob);
            }
          } catch (e) {
            console.error(`Failed to download photo for receipt ${ret.receiptNumber}`, e);
          }
          count++;
        }

        // Download video if exists
        if (ret.media.videoLocalPath) {
          try {
            setDownloadProgress(`${count + 1}/${totalFiles}`);
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unboxing-media/${ret.media.videoLocalPath}`;
            const res = await fetch(url);
            if (res.ok) {
              const blob = await res.blob();
              zip.file(`${ret.receiptNumber}_unboxing.mp4`, blob);
            }
          } catch (e) {
            console.error(`Failed to download video for receipt ${ret.receiptNumber}`, e);
          }
          count++;
        }
      }

      setDownloadProgress("Membuat ZIP...");
      const content = await zip.generateAsync({ type: "blob" });
      
      // Format current date: dd-mm-yy
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const zipName = `${dd}-${mm}-${yy}.zip`;

      // Trigger download
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = zipName;
      a.click();
      
      // Clean up URL object
      setTimeout(() => URL.revokeObjectURL(a.href), 100);
      
      // Clear selection after successful download
      setSelectedIds([]);
    } catch (error) {
      console.error("Gagal mengunduh ZIP:", error);
      alert("Terjadi kesalahan saat mengunduh ZIP.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress("");
    }
  };

  const totalPages = Math.ceil(filteredReturns.length / ITEMS_PER_PAGE);
  const paginatedReturns = filteredReturns.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Riwayat Unboxing</h1>
          <p className="text-muted-foreground text-sm mt-1">{returns.length} total retur tercatat</p>
        </div>
        <Link href="/scan">
          <Button icon={<Package className="w-4 h-4" />}>Scan Baru</Button>
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <GlassCard className="!p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor resi atau kurir..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-foreground cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="uploaded">Terupload</option>
                <option value="pending">Menunggu</option>
                <option value="uploading">Mengupload</option>
                <option value="failed">Gagal</option>
              </select>
            </div>

            {/* Sort */}
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
              title={sortOrder === "desc" ? "Terbaru dulu" : "Terlama dulu"}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className={`p-2 rounded-xl border transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold ${
                isAllSelected
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border-border"
              }`}
              title={isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {isAllSelected ? "Batal Semua" : "Pilih Semua"}
              </span>
            </button>

            {/* View Mode Toggle */}
            <div className="hidden md:flex items-center gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Results */}
      {filteredReturns.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data"
          description={searchQuery ? "Tidak ditemukan retur yang cocok dengan pencarian." : "Belum ada retur yang tercatat."}
          action={
            <Link href="/scan">
              <Button>Mulai Scan</Button>
            </Link>
          }
        />
      ) : viewMode === "table" ? (
        /* Table View */
        <motion.div variants={itemVariants}>
          <GlassCard className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-12 py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/50 bg-muted cursor-pointer"
                      />
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">No. Resi</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Kurir</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden md:table-cell">Status Barang</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Durasi</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Waktu</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReturns.map((ret, i) => (
                    <motion.tr
                      key={ret.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                        selectedIds.includes(ret.id) ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(ret.id)}
                          onChange={() => handleSelectRow(ret.id)}
                          className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/50 bg-muted cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/history/${ret.id}`}
                          className="font-mono text-sm font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          {ret.receiptNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <StatusBadge status={ret.courierName} colorClass={getCourierColor(ret.courierName)} label={ret.courierName} />
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <StatusBadge
                          status={ret.statusBarang}
                          colorClass={getBarangStatusColor(ret.statusBarang)}
                          label={getBarangStatusLabel(ret.statusBarang)}
                        />
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-sm text-muted-foreground font-mono">
                        {formatDuration(ret.media.videoDuration)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        <span className="hidden lg:inline">{formatDateTime(ret.scannedAt)}</span>
                        <span className="lg:hidden">{getRelativeTime(ret.scannedAt)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={ret.media.uploadStatus}
                          colorClass={getStatusColor(ret.media.uploadStatus)}
                          label={getStatusLabel(ret.media.uploadStatus)}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      ) : (
        /* Grid View */
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedReturns.map((ret) => (
            <motion.div key={ret.id} variants={itemVariants}>
              <Link href={`/history/${ret.id}`}>
                <GlassCard
                  hover
                  className={`h-full relative transition-all ${
                    selectedIds.includes(ret.id) ? "border-emerald-500/50 ring-1 ring-emerald-500/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(ret.id)}
                          onChange={() => handleSelectRow(ret.id)}
                          className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500/50 bg-muted cursor-pointer"
                        />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    <StatusBadge
                      status={ret.media.uploadStatus}
                      colorClass={getStatusColor(ret.media.uploadStatus)}
                      label={getStatusLabel(ret.media.uploadStatus)}
                    />
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground mb-1">{ret.receiptNumber}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge status={ret.courierName} colorClass={getCourierColor(ret.courierName)} label={ret.courierName} />
                    <span>·</span>
                    <span>{getRelativeTime(ret.scannedAt)}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Durasi: {formatDuration(ret.media.videoDuration)}</span>
                    <StatusBadge
                      status={ret.statusBarang}
                      colorClass={getBarangStatusColor(ret.statusBarang)}
                      label={getBarangStatusLabel(ret.statusBarang)}
                    />
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredReturns.length)} dari {filteredReturns.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                    currentPage === page
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-lg"
          >
            <div className="bg-card/90 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-foreground">
                  {selectedIds.length} item dipilih
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  disabled={isDownloading}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={isDownloading}
                  icon={isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                >
                  {isDownloading ? `Mengunduh (${downloadProgress})` : "Download ZIP"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
