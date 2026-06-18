import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
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

    let photoFileName = "";
    let videoFileName = "";

    const uploadToSupabase = async (file: File, filename: string, mimeType: string) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { data, error } = await supabaseAdmin.storage
        .from("unboxing-media")
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        throw error;
      }
      return filename;
    };

    if (photo) {
      photoFileName = await uploadToSupabase(photo, `${receiptNumber}_resi.jpg`, "image/jpeg");
    }

    if (video) {
      videoFileName = await uploadToSupabase(video, video.name, video.type);
    }

    // Update media record in DB if there are files
    if (photoFileName || videoFileName) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const bucketBase = `${supabaseUrl}/storage/v1/object/public/unboxing-media`;

      const updateData: Record<string, unknown> = {
        uploadStatus: "uploaded",
        uploadedAt: new Date(),
      };
      if (photoFileName) {
        updateData.photoLocalPath = photoFileName;
        updateData.photoCloudUrl = `${bucketBase}/${photoFileName}`;
      }
      if (videoFileName) {
        updateData.videoLocalPath = videoFileName;
        updateData.videoCloudUrl = `${bucketBase}/${videoFileName}`;
      }

      await db.update(media)
        .set(updateData)
        .where(eq(media.returnId, parseInt(id)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

