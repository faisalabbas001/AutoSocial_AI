import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessId } from "@/lib/current";
import { keyFromUrl, deleteObject } from "@/lib/storage";
import { Prisma, type Platform } from "@prisma/client";

export const dynamic = "force-dynamic";

const PLATFORM = z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN"]);

const patchSchema = z.object({
  captions: z.array(z.object({ platform: PLATFORM, text: z.string() })).optional(),
  hashtags: z.array(z.object({ platform: PLATFORM, tags: z.array(z.string()) })).optional(),
  // Reviewer edit controls (applied to the per-platform rendition at publish time).
  subtitlesEnabled: z.boolean().optional(),
  trimStart: z.number().int().min(0).nullable().optional(),
  trimEnd: z.number().int().min(0).nullable().optional(),
});

/**
 * Save reviewer edits: per-platform captions/hashtags plus the video-level edit
 * controls (subtitles on/off, trim in/out). Upserts caption/hashtag rows so an
 * edit is never silently dropped when the pipeline didn't create that row.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const businessId = await requireBusinessId();
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Scope to the caller's business so one tenant can't edit another's video.
  const video = await prisma.video.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { captions = [], hashtags = [], subtitlesEnabled, trimStart, trimEnd } = parsed.data;

  if (trimStart != null && trimEnd != null && trimEnd <= trimStart) {
    return NextResponse.json({ error: "trimEnd must be after trimStart" }, { status: 400 });
  }

  // Determine which platform rows already exist so we update vs. create correctly.
  const [existingCaptions, existingHashtags] = await Promise.all([
    prisma.caption.findMany({ where: { videoId: id }, select: { platform: true } }),
    prisma.hashtag.findMany({ where: { videoId: id }, select: { platform: true } }),
  ]);
  const haveCaption = new Set(existingCaptions.map((c) => c.platform));
  const haveHashtag = new Set(existingHashtags.map((h) => h.platform));

  const ops: Prisma.PrismaPromise<unknown>[] = [
    ...captions.map((c) =>
      haveCaption.has(c.platform as Platform)
        ? prisma.caption.updateMany({ where: { videoId: id, platform: c.platform as Platform }, data: { text: c.text } })
        : prisma.caption.create({ data: { videoId: id, platform: c.platform as Platform, text: c.text } }),
    ),
    ...hashtags.map((h) =>
      haveHashtag.has(h.platform as Platform)
        ? prisma.hashtag.updateMany({ where: { videoId: id, platform: h.platform as Platform }, data: { tags: h.tags } })
        : prisma.hashtag.create({ data: { videoId: id, platform: h.platform as Platform, tags: h.tags } }),
    ),
  ];

  const videoData: { subtitlesEnabled?: boolean; trimStart?: number | null; trimEnd?: number | null } = {};
  if (subtitlesEnabled !== undefined) videoData.subtitlesEnabled = subtitlesEnabled;
  if (trimStart !== undefined) videoData.trimStart = trimStart;
  if (trimEnd !== undefined) videoData.trimEnd = trimEnd;
  if (Object.keys(videoData).length > 0) {
    ops.push(prisma.video.update({ where: { id }, data: videoData }));
  }

  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const businessId = await requireBusinessId();
  const video = await prisma.video.findFirst({
    where: { id, businessId },
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
  const businessId = await requireBusinessId();

  // Collect the storage objects before the row (and its thumbnails) are gone.
  const video = await prisma.video.findFirst({
    where: { id, businessId },
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
