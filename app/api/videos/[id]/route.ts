import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { keyFromUrl, deleteObject } from "@/lib/storage";
import type { Platform } from "@prisma/client";

export const dynamic = "force-dynamic";

const PLATFORM = z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN"]);

const patchSchema = z.object({
  captions: z.array(z.object({ platform: PLATFORM, text: z.string() })).optional(),
  hashtags: z.array(z.object({ platform: PLATFORM, tags: z.array(z.string()) })).optional(),
});

/**
 * Save reviewer edits to per-platform captions/hashtags before publishing.
 * Updates existing rows (created by the pipeline); no-ops for platforms not sent.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const video = await prisma.video.findUnique({ where: { id }, select: { id: true } });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { captions = [], hashtags = [] } = parsed.data;

  await prisma.$transaction([
    ...captions.map((c) =>
      prisma.caption.updateMany({
        where: { videoId: id, platform: c.platform as Platform },
        data: { text: c.text },
      }),
    ),
    ...hashtags.map((h) =>
      prisma.hashtag.updateMany({
        where: { videoId: id, platform: h.platform as Platform },
        data: { tags: h.tags },
      }),
    ),
  ]);

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      jobs: { orderBy: { createdAt: "asc" } },
      captions: true,
      hashtags: true,
      thumbnails: true,
      scheduledPosts: { include: { analytics: true } },
    },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ video });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Collect the storage objects before the row (and its thumbnails) are gone.
  const video = await prisma.video.findUnique({
    where: { id },
    select: { originalUrl: true, processedUrl: true, thumbnails: { select: { url: true } } },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.video.delete({ where: { id } });

  // Best-effort object cleanup (don't fail the delete if storage is unavailable).
  const keys = [
    keyFromUrl(video.originalUrl),
    keyFromUrl(video.processedUrl),
    ...video.thumbnails.map((t) => keyFromUrl(t.url)),
  ].filter((k): k is string => Boolean(k));
  await Promise.all(keys.map((k) => deleteObject(k).catch(() => {})));

  return NextResponse.json({ ok: true });
}
