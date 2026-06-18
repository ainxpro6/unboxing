// ============================================
// API Route — User Settings
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const DEFAULT_SETTINGS = {
  videoResolution: "1080p",
  videoFps: 30,
  maxDurationSeconds: 300,
  cloudProvider: "google_drive",
  autoUpload: true,
};

// GET /api/settings — Get user settings
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userSettings = await db.query.settings.findFirst({
    where: eq(settings.userId, session.user.id),
  });

  // Create default settings if not exists
  if (!userSettings) {
    const [created] = await db
      .insert(settings)
      .values({
        userId: session.user.id,
        ...DEFAULT_SETTINGS,
      })
      .returning();
    userSettings = created;
  }

  return NextResponse.json({ data: userSettings });
}

// PUT /api/settings — Update user settings
export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Only allow specific fields to be updated
  const allowedFields = [
    "videoResolution",
    "videoFps",
    "maxDurationSeconds",
    "cloudProvider",
    "autoUpload",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Check if settings exist
  const existing = await db.query.settings.findFirst({
    where: eq(settings.userId, session.user.id),
  });

  let userSettings;

  if (existing) {
    const [updated] = await db
      .update(settings)
      .set(updates)
      .where(eq(settings.userId, session.user.id))
      .returning();
    userSettings = updated;
  } else {
    const [created] = await db
      .insert(settings)
      .values({
        userId: session.user.id,
        ...DEFAULT_SETTINGS,
        ...updates,
      })
      .returning();
    userSettings = created;
  }

  return NextResponse.json({ data: userSettings });
}
