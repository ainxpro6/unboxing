// ============================================
// Unboxing Retur — TypeScript Type Definitions
// ============================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "staff";
  createdAt: string;
}

export interface ReturnItem {
  id: string;
  userId: number;
  receiptNumber: string;
  courierName: string;
  statusBarang: "baik" | "rusak" | "tidak_sesuai" | "kosong";
  scannedAt: string;
  media: MediaItem;
}

export interface MediaItem {
  id: string;
  returnId: string;
  photoLocalPath: string | null;
  photoCloudUrl: string | null;
  videoLocalPath: string | null;
  videoCloudUrl: string | null;
  uploadStatus: "pending" | "uploading" | "uploaded" | "failed";
  uploadedAt: string | null;
  videoDuration: number; // seconds
}

export interface Settings {
  videoResolution: "720p" | "1080p";
  videoFps: 30 | 60;
  maxDurationSeconds: number;
  cloudProvider: "google_drive" | "none";
  autoUpload: boolean;
}

export interface StorageInfo {
  usedBytes: number;
  totalBytes: number;
  fileCount: number;
}

export interface UploadQueueItem {
  id: string;
  receiptNumber: string;
  fileName: string;
  fileSize: number; // bytes
  progress: number; // 0-100
  status: "queued" | "uploading" | "completed" | "failed";
  createdAt: string;
}

export interface DailyStats {
  date: string;
  count: number;
}

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};
