import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessId } from "@/lib/current";
import { enqueueVideoProcessing } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const businessId = await requireBusinessId();
  const videos = await prisma.video.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: { thumbnails: { where: { isPrimary: true }, take: 1 } },
  });
  return NextResponse.json({ videos });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  originalUrl: z.string().url().optional(),
  duration: z.number().int().positive().optional(),
  fileSize: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const businessId = await requireBusinessId();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const video = await prisma.video.create({
    data: { businessId, status: "QUEUED", ...parsed.data },
  });

  // Enqueue the AI pipeline. If Redis is unavailable, the record still exists.
  try {
    await enqueueVideoProcessing(video.id);
  } catch (err) {
    logger.warn({ err: String(err), videoId: video.id }, "failed to enqueue — worker offline?");
  }

  return NextResponse.json({ video }, { status: 201 });
}
