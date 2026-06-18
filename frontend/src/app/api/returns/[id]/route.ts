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

  // Delete media first (cascade should handle this, but explicit is fine)
  await db.delete(media).where(eq(media.returnId, returnId));
  await db.delete(returns).where(eq(returns.id, returnId));

  return NextResponse.json({ success: true });
}
