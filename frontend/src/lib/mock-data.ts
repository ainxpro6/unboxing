// ============================================
// Unboxing Retur — Mock Data Generator
// ============================================

import type { ReturnItem, DailyStats, UploadQueueItem } from "@/types";

const couriers = ["JNE", "J&T", "SiCepat", "AnterAja", "Ninja", "Shopee Express"];
const statuses: ReturnItem["statusBarang"][] = ["baik", "rusak", "tidak_sesuai", "kosong"];
const uploadStatuses: ("pending" | "uploading" | "uploaded" | "failed")[] = [
  "uploaded", "uploaded", "uploaded", "uploaded", "uploaded",
  "pending", "uploading", "failed",
];

function randomResi(): string {
  const prefixes = ["NLX", "JNE", "JP", "SCE", "AJ", "SPX"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${prefix}${num}`;
}

function randomDate(daysBack: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * daysBack * 86400000);
  return past.toISOString();
}

export function generateMockReturns(count: number = 25): ReturnItem[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `ret-${(i + 1).toString().padStart(3, "0")}`;
    const receiptNumber = randomResi();
    const uploadStatus = uploadStatuses[Math.floor(Math.random() * uploadStatuses.length)];
    return {
      id,
      userId: 1,
      receiptNumber,
      courierName: couriers[Math.floor(Math.random() * couriers.length)],
      statusBarang: statuses[Math.floor(Math.random() * statuses.length)],
      scannedAt: randomDate(30),
      media: {
        id: `med-${id}`,
        returnId: id,
        photoLocalPath: `/storage/${receiptNumber}_resi.jpg`,
        photoCloudUrl: uploadStatus === "uploaded" ? `https://drive.google.com/file/${receiptNumber}_resi.jpg` : null,
        photoDriveFileId: uploadStatus === "uploaded" ? `mock-photo-${id}` : null,
        videoLocalPath: `/storage/${receiptNumber}_unboxing.mp4`,
        videoCloudUrl: uploadStatus === "uploaded" ? `https://drive.google.com/file/${receiptNumber}_unboxing.mp4` : null,
        videoDriveFileId: uploadStatus === "uploaded" ? `mock-video-${id}` : null,
        driveFolderId: uploadStatus === "uploaded" ? `mock-folder-${id}` : null,
        uploadStatus,
        uploadedAt: uploadStatus === "uploaded" ? randomDate(15) : null,
        videoDuration: Math.floor(Math.random() * 240) + 30,
      },
    };
  }).sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
}

export function generateDailyStats(): DailyStats[] {
  const stats: DailyStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    stats.push({
      date: date.toISOString().split("T")[0],
      count: Math.floor(Math.random() * 15) + 2,
    });
  }
  return stats;
}

export function generateUploadQueue(): UploadQueueItem[] {
  return Array.from({ length: 5 }, (_, i) => {
    const resi = randomResi();
    const status: UploadQueueItem["status"] = i === 0 ? "uploading" : i < 3 ? "queued" : i === 3 ? "completed" : "failed";
    return {
      id: `uq-${i + 1}`,
      receiptNumber: resi,
      fileName: `${resi}_unboxing.mp4`,
      fileSize: Math.floor(Math.random() * 50000000) + 5000000,
      progress: status === "uploading" ? Math.floor(Math.random() * 80) + 10 : status === "completed" ? 100 : 0,
      status,
      createdAt: randomDate(2),
    };
  });
}
