// ============================================
// Unboxing Retur — Utility Functions
// ============================================

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateString);
}

export function getCourierColor(courier: string): string {
  const colors: Record<string, string> = {
    "JNE": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "J&T": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "SiCepat": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "AnterAja": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "Ninja": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "Shopee Express": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return colors[courier] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    uploading: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    uploaded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Menunggu",
    uploading: "Mengupload",
    uploaded: "Terupload",
    failed: "Gagal",
  };
  return labels[status] || status;
}

export function getBarangStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    baik: "Baik",
    rusak: "Rusak",
    tidak_sesuai: "Tidak Sesuai",
    kosong: "Kosong",
  };
  return labels[status] || status;
}

export function getBarangStatusColor(status: string): string {
  const colors: Record<string, string> = {
    baik: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    rusak: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    tidak_sesuai: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    kosong: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };
  return colors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
}
