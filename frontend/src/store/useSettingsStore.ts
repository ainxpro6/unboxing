// ============================================
// Zustand Store — Settings (API-backed)
// ============================================

import { create } from "zustand";
import type { Settings } from "@/types";

const DEFAULT_SETTINGS: Settings = {
  videoResolution: "1080p",
  videoFps: 30,
  maxDurationSeconds: 300,
  cloudProvider: "google_drive",
  autoUpload: true,
};

interface SettingsStore {
  settings: Settings;
  isLoaded: boolean;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  isLoading: false,

  loadSettings: async () => {
    if (get().isLoaded || get().isLoading) return;
    set({ isLoading: true });

    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");

      const json = await res.json();
      const data = json.data;

      set({
        settings: {
          videoResolution: data.videoResolution || DEFAULT_SETTINGS.videoResolution,
          videoFps: data.videoFps || DEFAULT_SETTINGS.videoFps,
          maxDurationSeconds: data.maxDurationSeconds || DEFAULT_SETTINGS.maxDurationSeconds,
          cloudProvider: data.cloudProvider || DEFAULT_SETTINGS.cloudProvider,
          autoUpload: data.autoUpload ?? DEFAULT_SETTINGS.autoUpload,
        },
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      set({ isLoaded: true, isLoading: false });
    }
  },

  updateSettings: async (partial) => {
    // Optimistic update
    const prevSettings = get().settings;
    const updated = { ...prevSettings, ...partial };
    set({ settings: updated });

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });

      if (!res.ok) {
        // Revert on failure
        set({ settings: prevSettings });
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });

    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_SETTINGS),
      });
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  },
}));
