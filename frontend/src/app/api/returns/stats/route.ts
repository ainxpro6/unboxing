// ============================================
// API Route — Return Statistics
// ============================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { returns, media } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";

// GET /api/returns/stats — Get dashboard statistics
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Today's start
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Today count
  const todayCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(returns)
    .where(
      and(
        eq(returns.userId, userId),
        gte(returns.scannedAt, todayStart)
      )
    );
  const todayCount = Number(todayCountResult[0]?.count || 0);

  // Total count
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(returns)
    .where(eq(returns.userId, userId));
  const totalCount = Number(totalCountResult[0]?.count || 0);

  // Pending upload count
  const pendingResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .innerJoin(returns, eq(media.returnId, returns.id))
    .where(
      and(
        eq(returns.userId, userId),
        sql`${media.uploadStatus} IN ('pending', 'failed')`
      )
    );
  const pendingCount = Number(pendingResult[0]?.count || 0);

  // Uploaded count (for success rate)
  const uploadedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .innerJoin(returns, eq(media.returnId, returns.id))
    .where(
      and(
        eq(returns.userId, userId),
        eq(media.uploadStatus, "uploaded")
      )
    );
  const uploadedCount = Number(uploadedResult[0]?.count || 0);
  const successRate = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

  // Weekly stats (last 7 days)
  const weeklyStats = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(returns)
      .where(
        and(
          eq(returns.userId, userId),
          gte(returns.scannedAt, dayStart),
          sql`${returns.scannedAt} <= ${dayEnd}`
        )
      );

    weeklyStats.push({
      date: dayStart.toISOString().split("T")[0],
      count: Number(dayCountResult[0]?.count || 0),
    });
  }

  return NextResponse.json({
    todayCount,
    totalCount,
    pendingCount,
    successRate,
    weeklyStats,
  });
}
