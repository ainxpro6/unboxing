// ============================================
// Zustand Store — Storage & Upload Queue
// ============================================

import { create } from "zustand";
import type { StorageInfo, UploadQueueItem } from "@/types";

interface StorageStore {
  storageInfo: StorageInfo;
  uploadQueue: any[]; // Using any to match the API response loosely
  isConnected: boolean;
  isLoaded: boolean;
  loadStorage: () => Promise<void>;
  retryUpload: (id: string) => Promise<void>;
  clearCompleted: () => void;
}

export const useStorageStore = create<StorageStore>((set, get) => ({
  storageInfo: {
    usedBytes: 0,
    totalBytes: 1, // Avoid divide by zero
    fileCount: 0,
  },
  uploadQueue: [],
  isConnected: false,
  isLoaded: false,

  loadStorage: async () => {
    try {
      const res = await fetch("/api/storage/stats");
      if (res.ok) {
        const { data } = await res.json();
        set({
          storageInfo: {
            usedBytes: data.usedSpaceBytes,
            totalBytes: data.totalSpaceBytes,
            fileCount: data.fileCount,
          },
          uploadQueue: data.queue,
          isConnected: data.isConnected,
          isLoaded: true,
        });
      }
    } catch (e) {
      console.error("Failed to load storage stats:", e);
    }
  },

  retryUpload: async (id) => {
    try {
      // In a real app we'd trigger a background sync retry here
      await fetch(`/api/media/${id}/status`, { method: "POST" });
      await get().loadStorage();
    } catch (e) {
      console.error("Failed to retry upload:", e);
    }
  },

  clearCompleted: () => {
    // Not applicable since we only fetch active queue from API
  },
}));
