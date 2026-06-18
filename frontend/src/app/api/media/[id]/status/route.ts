// ============================================
// API Route — Media Upload Status
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { media, returns } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

// PUT /api/media/:id/status — Update upload status
export async function PUT(
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
  const mediaId = parseInt(id);

  if (isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const { uploadStatus, photoCloudUrl, videoCloudUrl } = body;

  const validStatuses = ["pending", "uploading", "uploaded", "failed"];
  if (uploadStatus && !validStatuses.includes(uploadStatus)) {
    return NextResponse.json({ error: "Invalid upload status" }, { status: 400 });
  }

  // Verify ownership: media → return → user
  const mediaItem = await db.query.media.findFirst({
    where: eq(media.id, mediaId),
    with: {
      returnItem: true,
    },
  });

  if (!mediaItem || mediaItem.returnItem.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (uploadStatus) updates.uploadStatus = uploadStatus;
  if (photoCloudUrl) updates.photoCloudUrl = photoCloudUrl;
  if (videoCloudUrl) updates.videoCloudUrl = videoCloudUrl;
  if (uploadStatus === "uploaded") updates.uploadedAt = new Date();

  const [updated] = await db
    .update(media)
    .set(updates)
    .where(eq(media.id, mediaId))
    .returning();

  return NextResponse.json({ data: updated });
}

