// ============================================
// API Route — Media Upload (Google Drive)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { GoogleDriveService, GoogleDriveError } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;
    const receiptNumber = formData.get("receiptNumber") as string;
    const photo = formData.get("photo") as File | null;
    const video = formData.get("video") as File | null;

    if (!id || !receiptNumber) {
      return NextResponse.json(
        { error: "id and receiptNumber are required" },
        { status: 400 }
      );
    }

    const returnId = parseInt(id);

    // Update status to uploading
    await db
      .update(media)
      .set({ uploadStatus: "uploading" })
      .where(eq(media.returnId, returnId));

    // Initialize Google Drive service
    const driveService = new GoogleDriveService(session.user.id);

    try {
      await driveService.initialize();
    } catch (error) {
      console.error("[Upload] Failed to initialize Google Drive:", error);
      await db
        .update(media)
        .set({ uploadStatus: "failed" })
        .where(eq(media.returnId, returnId));

      const message =
        error instanceof GoogleDriveError
          ? error.message
          : "Failed to initialize Google Drive";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Ensure date-based folder exists: Unboxing/YYYY/MM
    let folderId: string;
    try {
      folderId = await driveService.ensureDateFolder();
    } catch (error) {
      console.error("[Upload] Failed to create Drive folder:", error);
      await db
        .update(media)
        .set({ uploadStatus: "failed" })
        .where(eq(media.returnId, returnId));
      return NextResponse.json(
        { error: "Failed to create Drive folder" },
        { status: 500 }
      );
    }

    const updateData: Record<string, unknown> = {
      driveFolderId: folderId,
    };

    // Upload photo
    if (photo) {
      try {
        const arrayBuffer = await photo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await driveService.uploadFile({
          fileName: `${receiptNumber}_resi.jpg`,
          mimeType: "image/jpeg",
          body: buffer,
          folderId,
        });

        updateData.photoLocalPath = `${receiptNumber}_resi.jpg`;
        updateData.photoCloudUrl = result.webViewLink;
        updateData.photoDriveFileId = result.fileId;

        console.log(
          `[Upload] Photo uploaded: ${receiptNumber}_resi.jpg → ${result.fileId}`
        );
      } catch (error) {
        console.error(`[Upload] Photo upload failed for ${receiptNumber}:`, error);
        // Continue with video upload even if photo fails
      }
    }

    // Upload video
    if (video) {
      try {
        const arrayBuffer = await video.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await driveService.uploadFile({
          fileName: video.name,
          mimeType: video.type || "video/webm",
          body: buffer,
          folderId,
        });

        updateData.videoLocalPath = video.name;
        updateData.videoCloudUrl = result.webViewLink;
        updateData.videoDriveFileId = result.fileId;

        console.log(
          `[Upload] Video uploaded: ${video.name} → ${result.fileId}`
        );
      } catch (error) {
        console.error(`[Upload] Video upload failed for ${receiptNumber}:`, error);
      }
    }

    // Determine final status
    const hasPhoto = !!updateData.photoDriveFileId;
    const hasVideo = !!updateData.videoDriveFileId;
    const photoRequested = !!photo;
    const videoRequested = !!video;

    // If at least one file was uploaded successfully
    if (hasPhoto || hasVideo) {
      // If all requested files were uploaded
      if (
        (!photoRequested || hasPhoto) &&
        (!videoRequested || hasVideo)
      ) {
        updateData.uploadStatus = "uploaded";
        updateData.uploadedAt = new Date();
      } else {
        // Partial upload — mark as uploaded but log the partial failure
        updateData.uploadStatus = "uploaded";
        updateData.uploadedAt = new Date();
        console.warn(
          `[Upload] Partial upload for ${receiptNumber}: photo=${hasPhoto}, video=${hasVideo}`
        );
      }
    } else if (photoRequested || videoRequested) {
      // All uploads failed
      updateData.uploadStatus = "failed";
    }

    // Update database
    await db
      .update(media)
      .set(updateData)
      .where(eq(media.returnId, returnId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Upload] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
