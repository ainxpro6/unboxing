// ============================================
// Zustand Store — Return Items (API-backed)
// ============================================

import { create } from "zustand";
import type { ReturnItem, DailyStats } from "@/types";

interface ReturnStore {
  returns: ReturnItem[];
  isLoaded: boolean;
  isLoading: boolean;
  stats: {
    todayCount: number;
    totalCount: number;
    pendingCount: number;
    successRate: number;
    weeklyStats: DailyStats[];
    trends?: {
      today: string;
      total: string;
      successRate: string;
    };
  } | null;
  loadReturns: () => Promise<void>;
  loadStats: () => Promise<void>;
  addReturn: (data: {
    receiptNumber: string;
    courierName: string;
    statusBarang: string;
    videoDuration: number;
    videoExtension?: string;
  }) => Promise<ReturnItem | null>;
  getReturnById: (id: string) => ReturnItem | undefined;
  deleteReturn: (id: string) => Promise<void>;
  getTodayCount: () => number;
  getPendingUploadCount: () => number;
  getSuccessRate: () => number;
}

export const useReturnStore = create<ReturnStore>((set, get) => ({
  returns: [],
  isLoaded: false,
  isLoading: false,
  stats: null,

  loadReturns: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      const res = await fetch("/api/returns?limit=100");
      if (!res.ok) throw new Error("Failed to fetch returns");

      const json = await res.json();
      // Transform API response to match frontend types
      const returns: ReturnItem[] = json.data.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        userId: r.userId,
        receiptNumber: r.receiptNumber,
        courierName: r.courierName,
        statusBarang: r.statusBarang,
        scannedAt: r.scannedAt,
        media: r.media
          ? {
              id: String((r.media as Record<string, unknown>).id),
              returnId: String((r.media as Record<string, unknown>).returnId),
              photoLocalPath: (r.media as Record<string, unknown>).photoLocalPath,
              photoCloudUrl: (r.media as Record<string, unknown>).photoCloudUrl,
              photoDriveFileId: (r.media as Record<string, unknown>).photoDriveFileId,
              videoLocalPath: (r.media as Record<string, unknown>).videoLocalPath,
              videoCloudUrl: (r.media as Record<string, unknown>).videoCloudUrl,
              videoDriveFileId: (r.media as Record<string, unknown>).videoDriveFileId,
              driveFolderId: (r.media as Record<string, unknown>).driveFolderId,
              uploadStatus: (r.media as Record<string, unknown>).uploadStatus,
              uploadedAt: (r.media as Record<string, unknown>).uploadedAt,
              videoDuration: (r.media as Record<string, unknown>).videoDuration,
            }
          : {
              id: "",
              returnId: String(r.id),
              photoLocalPath: null,
              photoCloudUrl: null,
              photoDriveFileId: null,
              videoLocalPath: null,
              videoCloudUrl: null,
              videoDriveFileId: null,
              driveFolderId: null,
              uploadStatus: "pending",
              uploadedAt: null,
              videoDuration: 0,
            },
      }));

      set({ returns, isLoaded: true, isLoading: false });
    } catch (error) {
      console.error("Failed to load returns:", error);
      set({ isLoading: false, isLoaded: true });
    }
  },

  loadStats: async () => {
    try {
      const res = await fetch("/api/returns/stats");
      if (!res.ok) return;

      const stats = await res.json();
      set({ stats });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  },

  addReturn: async (data) => {
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create return");

      const json = await res.json();
      const newReturn: ReturnItem = {
        id: String(json.data.id),
        userId: json.data.userId,
        receiptNumber: json.data.receiptNumber,
        courierName: json.data.courierName,
        statusBarang: json.data.statusBarang,
        scannedAt: json.data.scannedAt,
        media: {
          id: String(json.data.media.id),
          returnId: String(json.data.media.returnId),
          photoLocalPath: json.data.media.photoLocalPath,
          photoCloudUrl: json.data.media.photoCloudUrl,
          photoDriveFileId: json.data.media.photoDriveFileId,
          videoLocalPath: json.data.media.videoLocalPath,
          videoCloudUrl: json.data.media.videoCloudUrl,
          videoDriveFileId: json.data.media.videoDriveFileId,
          driveFolderId: json.data.media.driveFolderId,
          uploadStatus: json.data.media.uploadStatus,
          uploadedAt: json.data.media.uploadedAt,
          videoDuration: json.data.media.videoDuration,
        },
      };

      set({ returns: [newReturn, ...get().returns] });
      return newReturn;
    } catch (error) {
      console.error("Failed to add return:", error);
      return null;
    }
  },

  getReturnById: (id) => {
    return get().returns.find((r) => r.id === id);
  },

  deleteReturn: async (id) => {
    try {
      const res = await fetch(`/api/returns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete return");

      set({ returns: get().returns.filter((r) => r.id !== id) });
    } catch (error) {
      console.error("Failed to delete return:", error);
    }
  },

  getTodayCount: () => {
    return get().stats?.todayCount || 0;
  },

  getPendingUploadCount: () => {
    return get().stats?.pendingCount || 0;
  },

  getSuccessRate: () => {
    return get().stats?.successRate || 0;
  },
}));
