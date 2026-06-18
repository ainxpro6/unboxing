import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account, media, returns } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseClient";

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

    // Calculate cloud storage usage
    let usedSpaceBytes = 0;
    let fileCount = 0;
    
    try {
      const { data, error } = await supabaseAdmin.storage
        .from("unboxing-media")
        .list("", { limit: 1000 });
        
      if (data && !error) {
        for (const file of data) {
          if (file.id) { // Ensure it's a file, not a folder
            usedSpaceBytes += file.metadata?.size || 0;
            fileCount++;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch storage stats", e);
    }

    // Supabase free tier: 1GB storage
    const totalSpaceBytes = 1 * 1024 * 1024 * 1024;

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
      .where(inArray(media.uploadStatus, ["pending", "uploading", "failed"]));

    const queue = activeMedia.map(m => ({
      id: m.id.toString(),
      receiptNumber: m.receiptNumber,
      status: m.uploadStatus,
      progress: m.uploadStatus === "uploading" ? 50 : 0, // Mock progress for uploading
      fileName: `${m.receiptNumber}_unboxing.webm`, // Displaying video as primary name
    }));

    return NextResponse.json({
      data: {
        totalSpaceBytes,
        usedSpaceBytes,
        fileCount,
        isConnected,
        activeConnections: isConnected ? 1 : 0,
        queue,
      }
    });
  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
