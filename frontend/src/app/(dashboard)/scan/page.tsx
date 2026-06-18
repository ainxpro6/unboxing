"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  Camera,
  Square,
  CheckCircle2,
  RotateCcw,
  Keyboard,
  Zap,
  Timer,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useReturnStore } from "@/store/useReturnStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";

type ScanState = "idle" | "scanning" | "detected" | "capturing" | "recording" | "complete";

export default function ScanPage() {
  const [state, setState] = useState<ScanState>("idle");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [manualInput, setManualInput] = useState(false);
  const [manualResi, setManualResi] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoExtension, setVideoExtension] = useState("webm");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const photoBlobRef = useRef<Blob | null>(null);

  const recordingTimeRef = useRef(0);
  const receiptNumberRef = useRef("");

  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  useEffect(() => {
    receiptNumberRef.current = receiptNumber;
  }, [receiptNumber]);

  const { addReturn, loadReturns } = useReturnStore();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadReturns();
    loadSettings();
  }, [loadReturns, loadSettings]);

  // Play beep sound on detection
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 1200;
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch {
      // Audio not supported
    }
  }, []);

  // Stop camera & scanner
  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      scanner.stop()
        .then(() => {
          try {
            scanner.clear();
          } catch (err) {
            console.error("Failed to clear scanner:", err);
          }
        })
        .catch((err) => {
          console.error("Failed to stop scanner:", err);
        });
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Upload and finish
  const finishAndSave = useCallback(async (videoBlob?: Blob, extension = "webm") => {
    const currentResi = receiptNumberRef.current;

    // Detect courier from receipt number prefix
    const courierMap: Record<string, string> = {
      JNE: "JNE",
      JP: "J&T",
      JD: "J&T",
      SCE: "SiCepat",
      SIC: "SiCepat",
      AJ: "AnterAja",
      SPX: "Shopee Express",
      NLX: "Ninja",
      ID: "ID Express",
      TKP: "Tokopedia",
    };

    let courierName = "Lainnya";
    for (const [prefix, name] of Object.entries(courierMap)) {
      if (currentResi.startsWith(prefix)) {
        courierName = name;
        break;
      }
    }

    // Call addReturn to save initial data
    const newReturn = await addReturn({
      receiptNumber: currentResi,
      courierName,
      statusBarang: "baik",
      videoDuration: recordingTimeRef.current,
      videoExtension: extension,
    });

    setState("complete");
    stopCamera();

    // Now upload files
    if (newReturn && (photoBlobRef.current || videoBlob)) {
      const formData = new FormData();
      formData.append("id", newReturn.id);
      formData.append("receiptNumber", currentResi);
      if (photoBlobRef.current) {
        formData.append("photo", photoBlobRef.current, `${currentResi}_resi.jpg`);
      }
      if (videoBlob) {
        formData.append("video", videoBlob, `${currentResi}_unboxing.${extension}`);
      }

      fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      }).catch((err) => {
        console.error("Upload failed", err);
      });
    }
  }, [addReturn, stopCamera]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      finishAndSave(undefined, videoExtension);
    }
  }, [finishAndSave, videoExtension]);

  // Start recording
  const startRecording = useCallback(() => {
    setState("recording");
    setRecordingTime(0);
    chunksRef.current = [];

    // Start camera for recording (separate from scanner)
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: settings.videoResolution === "1080p" ? 1920 : 1280 },
          height: { ideal: settings.videoResolution === "1080p" ? 1080 : 720 },
        },
        audio: true,
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Capture photo from video stream
          setTimeout(() => {
            if (videoRef.current) {
              const canvas = document.createElement("canvas");
              canvas.width = videoRef.current.videoWidth || 1280;
              canvas.height = videoRef.current.videoHeight || 720;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                  if (blob) photoBlobRef.current = blob;
                }, "image/jpeg", 0.85);
              }
            }
          }, 800); // Wait a bit for video to be ready and focused
        }

        let mimeType = "video/webm;codecs=vp8,opus";
        let extension = "webm";

        if (MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac")) {
          mimeType = "video/mp4;codecs=h264,aac";
          extension = "mp4";
        } else if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a")) {
          mimeType = "video/mp4;codecs=avc1,mp4a";
          extension = "mp4";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mimeType = "video/mp4";
          extension = "mp4";
        }

        setVideoExtension(extension);

        try {
          const mediaRecorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            finishAndSave(blob, extension);
          };

          mediaRecorder.start(1000); // capture in chunks of 1 second
        } catch (err) {
          console.error("Failed to initialize MediaRecorder", err);
        }
      })
      .catch((err) => {
        console.error("Failed to access camera/mic", err);
      });

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev + 1 >= settings.maxDurationSeconds) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [settings.maxDurationSeconds, settings.videoResolution, stopRecording, finishAndSave]);

  // Handle barcode detected (both from scanner and manual)
  const onBarcodeDetected = useCallback(
    (resi: string) => {
      playBeep();
      setState("detected");
      setReceiptNumber(resi);
      receiptNumberRef.current = resi;

      // Stop the scanner after detection
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        scanner.stop()
          .then(() => {
            try {
              scanner.clear();
            } catch (err) {
              console.error("Failed to clear scanner after detection:", err);
            }
          })
          .catch((err) => {
            console.error("Failed to stop scanner after detection:", err);
          });
      }

      // Auto-capture after brief delay
      setTimeout(() => {
        setState("capturing");
        setTimeout(() => {
          startRecording();
        }, 800);
      }, 1200);
    },
    [playBeep, startRecording]
  );

  // Start camera with real barcode scanning
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      // Dynamic import html5-qrcode (client-only)
      const { Html5Qrcode } = await import("html5-qrcode");

      // Create a unique container ID
      const containerId = "barcode-scanner-container";

      // Make sure the container element exists
      if (!scannerContainerRef.current) {
        setCameraError("Scanner container not found");
        return;
      }

      // Ensure the container has the right id
      scannerContainerRef.current.id = containerId;

      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;

      setState("scanning");

      // Start scanning with environment camera
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            // Make the scanning box wider and taller (larger detection area)
            const qrWidth = Math.floor(width * 0.85);
            const qrHeight = Math.floor(height * 0.7);
            return {
              width: Math.max(250, Math.min(qrWidth, 600)),
              height: Math.max(120, Math.min(qrHeight, 350))
            };
          },
          aspectRatio: 4 / 3,
          disableFlip: false,
        },
        (decodedText) => {
          // Barcode detected!
          onBarcodeDetected(decodedText.trim().toUpperCase());
        },
        () => {
          // QR scan error (no code found in frame) — ignore
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan dan gunakan HTTPS."
      );
      setState("idle");
    }
  }, [onBarcodeDetected]);

  // Manual resi entry
  const handleManualSubmit = useCallback(() => {
    if (manualResi.trim().length < 3) return;
    const resi = manualResi.trim().toUpperCase();
    setReceiptNumber(resi);
    receiptNumberRef.current = resi;
    setState("detected");

    playBeep();

    setTimeout(() => {
      setState("capturing");
      setTimeout(() => {
        startRecording();
      }, 800);
    }, 1200);
  }, [manualResi, playBeep, startRecording]);

  // Reset everything
  const resetScan = useCallback(() => {
    setState("idle");
    setReceiptNumber("");
    setManualResi("");
    setRecordingTime(0);
    setManualInput(false);
    stopCamera();
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopCamera]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Scanner</h1>
        <p className="text-muted-foreground text-sm mt-1">Scan barcode resi lalu rekam proses unboxing</p>
      </motion.div>

      {/* Main Scanner Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
          {/* Camera View */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
            {/* Scanner container for html5-qrcode (used during scanning state) */}
            <div
              ref={scannerContainerRef}
              className={`absolute inset-0 w-full h-full ${
                state === "scanning" ? "" : "hidden"
              }`}
              style={{ minHeight: "300px" }}
            />

            {/* Video element for recording state */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                state === "recording" ? "" : "hidden"
              }`}
            />

            {/* Idle State */}
            <AnimatePresence>
              {state === "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
                >
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                      <ScanLine className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-emerald-500 pulse-ring" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground mb-2">Siap Memindai</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Arahkan barcode atau QR Code resi ke kamera untuk memulai proses dokumentasi otomatis
                    </p>
                  </div>

                  {cameraError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {cameraError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="xl" onClick={startCamera} icon={<Camera className="w-5 h-5" />}>
                      Buka Kamera
                    </Button>
                    <Button
                      size="xl"
                      variant="outline"
                      onClick={() => setManualInput(!manualInput)}
                      icon={<Keyboard className="w-5 h-5" />}
                    >
                      Input Manual
                    </Button>
                  </div>

                  {/* Manual Input */}
                  <AnimatePresence>
                    {manualInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full max-w-sm"
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualResi}
                            onChange={(e) => setManualResi(e.target.value)}
                            placeholder="Masukkan nomor resi..."
                            className="flex-1 px-4 py-2.5 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-foreground"
                            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                          />
                          <Button onClick={handleManualSubmit} disabled={manualResi.trim().length < 3}>
                            Mulai
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning Overlay */}
            {state === "scanning" && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Status */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
                  <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full recording-dot" />
                    <span className="text-sm font-medium text-foreground">Mencari barcode...</span>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4 pointer-events-auto z-20">
                  <Button size="lg" variant="secondary" onClick={resetScan}>
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {/* Detected Flash */}
            <AnimatePresence>
              {state === "detected" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.5] }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-white/10 backdrop-blur-sm z-20"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/40">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-bold text-foreground">Resi Terdeteksi!</p>
                    <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{receiptNumber}</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Capturing Photo */}
            <AnimatePresence>
              {state === "capturing" && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center z-20"
                >
                  <div className="text-center glass px-6 py-4 rounded-2xl">
                    <Camera className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">Mengambil foto resi...</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{receiptNumber}_resi.jpg</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording */}
            {state === "recording" && (
              <div className="absolute inset-0 z-10">
                {/* Recording indicator */}
                <div className="absolute top-4 left-4 glass px-4 py-2 rounded-full flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full recording-dot" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">REC</span>
                </div>

                {/* Timer */}
                <div className="absolute top-4 right-4 glass px-4 py-2 rounded-full flex items-center gap-2">
                  <Timer className="w-4 h-4 text-foreground" />
                  <span className="text-sm font-bold text-foreground font-mono">
                    {formatDuration(recordingTime)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {formatDuration(settings.maxDurationSeconds)}</span>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-20 left-4 right-4">
                  <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(recordingTime / settings.maxDurationSeconds) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stop button */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl shadow-red-500/40 transition-colors active:scale-95"
                  >
                    <Square className="w-6 h-6 text-white fill-white" />
                  </button>
                </div>

                {/* File name */}
                <div className="absolute bottom-4 left-4 glass px-3 py-1.5 rounded-lg">
                  <p className="text-xs font-mono text-foreground">{receiptNumber}_unboxing.{videoExtension}</p>
                </div>
              </div>
            )}

            {/* Complete */}
            <AnimatePresence>
              {state === "complete" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50/90 to-teal-50/90 dark:from-emerald-950/90 dark:to-teal-950/90 z-20"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="text-center p-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-emerald-500/30">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Unboxing Selesai!</h2>
                    <p className="text-muted-foreground text-sm mb-6">Data berhasil disimpan</p>

                    <div className="bg-card border border-border rounded-xl p-4 mb-6 text-left space-y-2 max-w-xs mx-auto">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">No. Resi</span>
                        <span className="font-mono font-semibold text-foreground">{receiptNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Foto</span>
                        <span className="text-foreground">{receiptNumber}_resi.jpg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Video</span>
                        <span className="text-foreground">{formatDuration(recordingTime)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Menunggu Upload</span>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                      <Button size="lg" onClick={resetScan} icon={<RotateCcw className="w-5 h-5" />}>
                        Scan Berikutnya
                      </Button>
                      <Link href="/history">
                        <Button size="lg" variant="outline">
                          Lihat Riwayat
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Tips Penggunaan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: "1", title: "Scan Resi", desc: "Arahkan barcode resi ke kamera" },
              { step: "2", title: "Auto Record", desc: "Video otomatis mulai merekam" },
              { step: "3", title: "Selesai", desc: "Tekan stop & file tersimpan" },
            ].map((tip) => (
              <div key={tip.step} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {tip.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                  <p className="text-xs text-muted-foreground">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
