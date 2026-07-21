import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessId } from "@/lib/current";
import { putObject, videoKey } from "@/lib/storage";
import { enqueueVideoProcessing } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-side multipart upload: receives the video file, stores it in object
 * storage (MinIO/R2), creates the Video record, and enqueues the AI pipeline.
 *
 * For very large files a production build should switch to browser → presigned
 * PUT (see `createUploadUrl` in lib/storage) to avoid buffering in the server.
 */
export async function POST(req: NextRequest) {
  const businessId = await requireBusinessId();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "File must be a video" }, { status: 400 });
  }

  const title = (form.get("title") as string) || file.name.replace(/\.[^.]+$/, "");
  const durationRaw = form.get("duration");
  const duration = durationRaw ? Math.round(Number(durationRaw)) || null : null;

  // Store the bytes.
  const key = videoKey(businessId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  let originalUrl: string;
  try {
    originalUrl = await putObject(key, buffer, file.type);
  } catch (err) {
    logger.error({ err: String(err) }, "storage upload failed");
    return NextResponse.json({ error: "Storage upload failed. Is MinIO running?" }, { status: 502 });
  }

  const video = await prisma.video.create({
    data: {
      businessId,
      title,
      status: "QUEUED",
      originalUrl,
      duration,
      fileSize: file.size,
    },
  });

  try {
    await enqueueVideoProcessing(video.id);
  } catch (err) {
    logger.warn({ err: String(err), videoId: video.id }, "failed to enqueue — worker offline?");
  }

  return NextResponse.json({ video }, { status: 201 });
}
