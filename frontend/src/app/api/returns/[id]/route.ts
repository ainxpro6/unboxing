// ============================================
// API Route — Single Return (Detail & Delete)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { returns, media } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

// GET /api/returns/:id — Get a single return
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const returnId = parseInt(id);

  if (isNaN(returnId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const returnItem = await db.query.returns.findFirst({
    where: and(eq(returns.id, returnId), eq(returns.userId, session.user.id)),
    with: {
      media: true,
    },
  });

  if (!returnItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: returnItem });
}

// DELETE /api/returns/:id — Delete a return
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const returnId = parseInt(id);

  if (isNaN(returnId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Verify ownership
  const existing = await db.query.returns.findFirst({
    where: and(eq(returns.id, returnId), eq(returns.userId, session.user.id)),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get associated media to delete files from Google Drive
  const mediaItem = await db.query.media.findFirst({
    where: eq(media.returnId, returnId),
  });

  if (mediaItem) {
    try {
      const { GoogleDriveService } = await import("@/lib/google-drive");
      const driveService = new GoogleDriveService(session.user.id);
      await driveService.initialize();

      if (mediaItem.photoDriveFileId) {
        await driveService.deleteFile(mediaItem.photoDriveFileId).catch((err) =>
          console.error(`[DELETE API] Gagal menghapus foto Drive ${mediaItem.photoDriveFileId}:`, err)
        );
      }

      if (mediaItem.videoDriveFileId) {
        await driveService.deleteFile(mediaItem.videoDriveFileId).catch((err) =>
          console.error(`[DELETE API] Gagal menghapus video Drive ${mediaItem.videoDriveFileId}:`, err)
        );
      }
    } catch (driveErr) {
      console.error("[DELETE API] Gagal menginisialisasi GoogleDriveService:", driveErr);
    }
  }

  // Delete media first (cascade should handle this, but explicit is fine)
  await db.delete(media).where(eq(media.returnId, returnId));
  await db.delete(returns).where(eq(returns.id, returnId));

  return NextResponse.json({ success: true });
}
