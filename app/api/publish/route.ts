import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { enqueuePublish } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const schema = z.object({
  videoId: z.string().uuid(),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN"])).min(1),
  scheduledAt: z.string().datetime().optional(),
});

/**
 * Creates a ScheduledPost per target platform (pulling the platform-specific
 * caption/hashtags produced by the pipeline) and enqueues each for publishing.
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { videoId, platforms, scheduledAt } = parsed.data;
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      captions: true,
      hashtags: true,
      thumbnails: { where: { isPrimary: true }, take: 1 },
      business: { include: { socialAccounts: true } },
    },
  });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const when = scheduledAt ? new Date(scheduledAt) : undefined;
  const created = [];

  for (const platform of platforms) {
    const account = video.business.socialAccounts.find((a) => a.platform === platform);
    if (!account) continue;

    const caption = video.captions.find((c) => c.platform === platform)?.text ?? "";
    const hashtags = video.hashtags.find((h) => h.platform === platform)?.tags ?? [];

    const post = await prisma.scheduledPost.create({
      data: {
        videoId,
        socialAccountId: account.id,
        platform,
        caption,
        hashtags,
        thumbnailUrl: video.thumbnails[0]?.url,
        status: when ? "SCHEDULED" : "PUBLISHING",
        scheduledAt: when,
      },
    });

    try {
      await enqueuePublish(post.id, when);
    } catch (err) {
      logger.warn({ err: String(err), postId: post.id }, "failed to enqueue publish");
    }
    created.push(post);
  }

  return NextResponse.json({ posts: created }, { status: 201 });
}
