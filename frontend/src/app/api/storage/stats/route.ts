// ============================================
// API Route — Storage Stats (Google Drive)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account, media, returns } from "@/db/schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { headers } from "next/headers";
import { GoogleDriveService } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Google Drive connection
    const userAccounts = await db.query.account.findMany({
      where: eq(account.userId, session.user.id),
    });

    const isConnected = userAccounts.some(acc => acc.providerId === "google");

    // Get storage quota from Google Drive API
    let usedSpaceBytes = 0;
    let totalSpaceBytes = 15 * 1024 * 1024 * 1024; // Default 15GB
    let fileCount = 0;

    if (isConnected) {
      try {
        const driveService = new GoogleDriveService(session.user.id);
        await driveService.initialize();

        const quota = await driveService.getStorageQuota();
        usedSpaceBytes = quota.usageBytes;
        totalSpaceBytes = quota.limitBytes || totalSpaceBytes;
      } catch (e) {
        console.error("[StorageStats] Failed to fetch Drive quota:", e);
        // Fall back to counting from database
      }

      // Count uploaded files from database
      try {
        const countResult = await db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(media)
          .innerJoin(returns, eq(media.returnId, returns.id))
          .where(eq(returns.userId, session.user.id));

        fileCount = Number(countResult[0]?.count || 0);
      } catch (e) {
        console.error("[StorageStats] Failed to count files:", e);
      }
    }

    // Count uploading files (pending or uploading)
    const uploadingCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .innerJoin(returns, eq(media.returnId, returns.id))
      .where(
        and(
          eq(returns.userId, session.user.id),
          inArray(media.uploadStatus, ["pending", "uploading"])
        )
      );
    const uploadingCount = Number(uploadingCountResult[0]?.count || 0);

    // Count successfully uploaded files
    const uploadedCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .innerJoin(returns, eq(media.returnId, returns.id))
      .where(
        and(
          eq(returns.userId, session.user.id),
          eq(media.uploadStatus, "uploaded")
        )
      );
    const uploadedCount = Number(uploadedCountResult[0]?.count || 0);

    // Count failed files
    const failedCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .innerJoin(returns, eq(media.returnId, returns.id))
      .where(
        and(
          eq(returns.userId, session.user.id),
          eq(media.uploadStatus, "failed")
        )
      );
    const failedCount = Number(failedCountResult[0]?.count || 0);

    // Fetch active queue
    const activeMedia = await db
      .select({
        id: media.id,
        returnId: media.returnId,
        uploadStatus: media.uploadStatus,
        receiptNumber: returns.receiptNumber,
      })
      .from(media)
      .innerJoin(returns, eq(media.returnId, returns.id))
      .where(
        and(
          eq(returns.userId, session.user.id),
          inArray(media.uploadStatus, ["pending", "uploading", "failed"])
        )
      );

    const queue = activeMedia.map(m => ({
      id: m.id.toString(),
      receiptNumber: m.receiptNumber,
      status: m.uploadStatus === "pending" ? "queued" : m.uploadStatus,
      progress: m.uploadStatus === "uploading" ? 50 : 0,
      fileName: `${m.receiptNumber}_unboxing.webm`,
    }));

    return NextResponse.json({
      data: {
        totalSpaceBytes,
        usedSpaceBytes,
        fileCount,
        isConnected,
        activeConnections: isConnected ? 1 : 0,
        uploadingCount,
        uploadedCount,
        failedCount,
        queue,
      }
    });
  } catch (error) {
    console.error("[StorageStats] API Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
