// ============================================
// API Route — Return Statistics
// ============================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { returns, media } from "@/db/schema";
import { eq, and, gte, lte, lt, sql } from "drizzle-orm";
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
          lte(returns.scannedAt, dayEnd)
        )
      );

    weeklyStats.push({
      date: dayStart.toISOString().split("T")[0],
      count: Number(dayCountResult[0]?.count || 0),
    });
  }

  // ----------------------------------------
  // Calculate Trends
  // ----------------------------------------

  // 1. Today vs Yesterday Trend
  const todayCountFromStats = weeklyStats[6]?.count || 0;
  const yesterdayCountFromStats = weeklyStats[5]?.count || 0;
  let todayTrend = "0%";
  if (yesterdayCountFromStats > 0) {
    const diff = ((todayCountFromStats - yesterdayCountFromStats) / yesterdayCountFromStats) * 100;
    todayTrend = diff >= 0 ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`;
  } else if (todayCountFromStats > 0) {
    todayTrend = "+100%";
  }

  // 2. Total Scans Trend (This Week vs Previous Week)
  const thisWeekTotal = weeklyStats.reduce((acc, curr) => acc + curr.count, 0);

  const prevWeekStart = new Date();
  prevWeekStart.setDate(prevWeekStart.getDate() - 14);
  prevWeekStart.setHours(0, 0, 0, 0);

  const prevWeekEnd = new Date();
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  prevWeekEnd.setHours(0, 0, 0, 0);

  const prevWeekResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(returns)
    .where(
      and(
        eq(returns.userId, userId),
        gte(returns.scannedAt, prevWeekStart),
        lt(returns.scannedAt, prevWeekEnd)
      )
    );
  const prevWeekTotal = Number(prevWeekResult[0]?.count || 0);

  let totalTrend = "0%";
  if (prevWeekTotal > 0) {
    const diff = ((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100;
    totalTrend = diff >= 0 ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`;
  } else if (thisWeekTotal > 0) {
    totalTrend = "+100%";
  }

  // 3. Success Rate Trend (This Week vs Previous Week)
  const thisWeekUploadedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .innerJoin(returns, eq(media.returnId, returns.id))
    .where(
      and(
        eq(returns.userId, userId),
        eq(media.uploadStatus, "uploaded"),
        gte(returns.scannedAt, prevWeekEnd)
      )
    );
  const thisWeekUploadedCount = Number(thisWeekUploadedResult[0]?.count || 0);
  const thisWeekSuccessRate = thisWeekTotal > 0 ? (thisWeekUploadedCount / thisWeekTotal) * 100 : 0;

  const prevWeekUploadedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .innerJoin(returns, eq(media.returnId, returns.id))
    .where(
      and(
        eq(returns.userId, userId),
        eq(media.uploadStatus, "uploaded"),
        gte(returns.scannedAt, prevWeekStart),
        lt(returns.scannedAt, prevWeekEnd)
      )
    );
  const prevWeekUploadedCount = Number(prevWeekUploadedResult[0]?.count || 0);
  const prevWeekSuccessRate = prevWeekTotal > 0 ? (prevWeekUploadedCount / prevWeekTotal) * 100 : 0;

  const diffSuccessRate = thisWeekSuccessRate - prevWeekSuccessRate;
  let successRateTrend = "0%";
  if (diffSuccessRate > 0) {
    successRateTrend = `+${Math.round(diffSuccessRate)}%`;
  } else if (diffSuccessRate < 0) {
    successRateTrend = `${Math.round(diffSuccessRate)}%`;
  }

  return NextResponse.json({
    todayCount,
    totalCount,
    pendingCount,
    successRate,
    weeklyStats,
    trends: {
      today: todayTrend,
      total: totalTrend,
      successRate: successRateTrend,
    },
  });
}
