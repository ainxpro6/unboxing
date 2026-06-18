// ============================================
// API Route — Returns (List & Create)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { returns, media } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { headers } from "next/headers";

// GET /api/returns — List returns for authenticated user
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const offset = (page - 1) * limit;

  const userReturns = await db.query.returns.findMany({
    where: eq(returns.userId, session.user.id),
    with: {
      media: true,
    },
    orderBy: [desc(returns.scannedAt)],
    limit,
    offset,
  });

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(returns)
    .where(eq(returns.userId, session.user.id));

  const total = Number(countResult[0]?.count || 0);

  return NextResponse.json({
    data: userReturns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/returns — Create a new return
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const {
    receiptNumber,
    courierName,
    statusBarang = "baik",
    videoDuration = 0,
    videoExtension = "webm",
  } = body;

  if (!receiptNumber || !courierName) {
    return NextResponse.json(
      { error: "receiptNumber and courierName are required" },
      { status: 400 }
    );
  }

  // Insert return record
  const [newReturn] = await db
    .insert(returns)
    .values({
      userId: session.user.id,
      receiptNumber,
      courierName,
      statusBarang,
      scannedAt: new Date(),
    })
    .returning();

  // Insert associated media record
  const [newMedia] = await db
    .insert(media)
    .values({
      returnId: newReturn.id,
      videoLocalPath: `${receiptNumber}_unboxing.${videoExtension}`,
      photoLocalPath: `${receiptNumber}_resi.jpg`,
      uploadStatus: "pending",
      videoDuration,
    })
    .returning();

  return NextResponse.json(
    {
      data: {
        ...newReturn,
        media: newMedia,
      },
    },
    { status: 201 }
  );
}
