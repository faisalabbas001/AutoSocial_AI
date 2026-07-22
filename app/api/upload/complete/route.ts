import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessId } from "@/lib/current";
import { publicUrl, keyFromUrl } from "@/lib/storage";
import { enqueueVideoProcessing } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const schema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  duration: z.number().int().positive().optional(),
  fileSize: z.number().int().nonnegative().optional(),
});

/**
 * Finalise a direct (presigned) upload: the bytes are already in storage, so we
 * just create the Video record and enqueue the AI pipeline. The client-reported
 * duration is provisional — the pipeline re-probes it with ffprobe.
 */
export async function POST(req: NextRequest) {
  const businessId = await requireBusinessId();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { key, title, duration, fileSize } = parsed.data;

  // Guard against a client pointing us at another tenant's key.
  const url = publicUrl(key);
  if (keyFromUrl(url) !== key || !key.startsWith(`videos/${businessId}/`)) {
    return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
  }

  const video = await prisma.video.create({
    data: {
      businessId,
      title,
      status: "QUEUED",
      originalUrl: url,
      duration: duration ?? null,
      fileSize: fileSize ?? null,
    },
  });

  try {
    await enqueueVideoProcessing(video.id);
  } catch (err) {
    logger.warn({ err: String(err), videoId: video.id }, "failed to enqueue — worker offline?");
  }

  return NextResponse.json({ video }, { status: 201 });
}
