"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Video,
  Cloud,
  User,
  Monitor,
  RotateCcw,
  Save,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useState } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const { settings, isLoaded, loadSettings, updateSettings, resetSettings } = useSettingsStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();
  const userImage = session?.user?.image;

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">Konfigurasi video, penyimpanan, dan profil</p>
      </motion.div>

      {/* Saved Toast */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Pengaturan berhasil disimpan!
        </motion.div>
      )}

      {/* Video Configuration */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Konfigurasi Video</h2>
              <p className="text-xs text-muted-foreground">Atur kualitas dan durasi rekaman</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Resolution */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Resolusi Video</label>
              <div className="grid grid-cols-2 gap-3">
                {(["720p", "1080p"] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => {
                      updateSettings({ videoResolution: res });
                      showSaved();
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      settings.videoResolution === res
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="font-semibold text-foreground">{res === "720p" ? "HD 720p" : "Full HD 1080p"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {res === "720p" ? "1280 × 720 · File lebih kecil" : "1920 × 1080 · Kualitas terbaik"}
                    </p>
                    {settings.videoResolution === res && (
                      <div className="mt-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* FPS */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Frame Rate (FPS)</label>
              <div className="grid grid-cols-2 gap-3">
                {([30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    onClick={() => {
                      updateSettings({ videoFps: fps });
                      showSaved();
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      settings.videoFps === fps
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="font-semibold text-foreground">{fps} FPS</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fps === 30 ? "Standar · Hemat penyimpanan" : "Smooth · Detail gerakan"}
                    </p>
                    {settings.videoFps === fps && (
                      <div className="mt-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Durasi Maksimal</label>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {Math.floor(settings.maxDurationSeconds / 60)}:{(settings.maxDurationSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={300}
                step={30}
                value={settings.maxDurationSeconds}
                onChange={(e) => {
                  updateSettings({ maxDurationSeconds: parseInt(e.target.value) });
                  showSaved();
                }}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0:30</span>
                <span>5:00</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Cloud Configuration */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Penyimpanan Cloud</h2>
              <p className="text-xs text-muted-foreground">Konfigurasi sinkronisasi otomatis</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Auto Upload */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Auto Upload</p>
                <p className="text-xs text-muted-foreground mt-0.5">Upload otomatis setelah rekaman selesai</p>
              </div>
              <button
                onClick={() => {
                  updateSettings({ autoUpload: !settings.autoUpload });
                  showSaved();
                }}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                  settings.autoUpload ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    settings.autoUpload ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Upload Path */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Format Path Upload</label>
              <div className="p-3 bg-muted rounded-xl font-mono text-sm text-muted-foreground">
                <span className="text-foreground">/UnboxingRetur</span>
                <span>/</span>
                <span className="text-blue-500">{"{{YYYY-MM}}"}</span>
                <span>/</span>
                <span className="text-emerald-500">{"{{NOMOR_RESI}}"}</span>
                <span>/</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contoh: /UnboxingRetur/2026-06/NLX1928374/
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Profile */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Profil</h2>
              <p className="text-xs text-muted-foreground">Informasi akun pengguna</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            {userImage ? (
              <img
                src={userImage}
                alt={userName}
                className="w-14 h-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {userInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{userName}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mt-1">
                Staff
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Akun
          </button>
        </GlassCard>
      </motion.div>

      {/* Reset */}
      <motion.div variants={itemVariants} className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={() => {
            resetSettings();
            showSaved();
          }}
        >
          Reset ke Default
        </Button>
      </motion.div>
    </motion.div>
  );
}
