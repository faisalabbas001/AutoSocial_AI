import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPublisher } from "@/lib/social";
import { hasFfmpeg, convertAspect } from "@/lib/media/ffmpeg";
import { PLATFORM_ASPECT } from "@/lib/media/aspect";
import { putObject } from "@/lib/storage";
import type { Platform } from "@prisma/client";

/**
 * Produce a version of the video in the target platform's aspect ratio
 * (e.g. 9:16 for Reels/TikTok/Shorts, 1:1 for LinkedIn) and return its URL.
 * Falls back to the original when ffmpeg is unavailable, the clip is very long,
 * or conversion fails — so publishing never blocks on it.
 */
async function renditionForPlatform(
  videoUrl: string,
  businessId: string,
  videoId: string,
  platform: Platform,
  durationSeconds: number | null,
): Promise<string> {
  const dims = PLATFORM_ASPECT[platform];
  if (!videoUrl.startsWith("http") || !dims) return videoUrl;
  if (durationSeconds != null && durationSeconds > 600) return videoUrl; // too long to re-encode
  if (!(await hasFfmpeg())) return videoUrl;

  const workDir = await mkdtemp(join(tmpdir(), `pub-${videoId.slice(0, 8)}-`));
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return videoUrl;
    const src = join(workDir, "src.mp4");
    await writeFile(src, Buffer.from(await res.arrayBuffer()));

    const out = join(workDir, "out.mp4");
    const r = await convertAspect(src, out, dims.w, dims.h);
    if (r.skipped) return videoUrl;

    const buf = await readFile(out);
    const url = await putObject(
      `renditions/${businessId}/${videoId}/${platform.toLowerCase()}.mp4`,
      buf,
      "video/mp4",
    );
    logger.info({ videoId, platform, ratio: dims.label }, "publish: aspect rendition ready");
    return url;
  } catch (err) {
    logger.warn({ videoId, platform, err: String(err) }, "aspect conversion failed — using original");
    return videoUrl;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Publishes a single scheduled post to its target platform, then records initial
 * analytics. Uses the stub publisher until real platform credentials are wired.
 */
export async function publishPost(scheduledPostId: string) {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: { video: true, socialAccount: true },
  });
  if (!post) throw new Error(`ScheduledPost ${scheduledPostId} not found`);

  await prisma.scheduledPost.update({
    where: { id: scheduledPostId },
    data: { status: "PUBLISHING" },
  });

  try {
    const publisher = getPublisher(post.platform);
    const account = {
      id: post.socialAccount.id,
      accessToken: post.socialAccount.accessToken,
      refreshToken: post.socialAccount.refreshToken,
      expiresAt: post.socialAccount.expiresAt,
    };
    // Frame the video to the platform's required aspect ratio before uploading.
    const baseUrl = post.video.processedUrl ?? post.video.originalUrl ?? "";
    const videoUrl = await renditionForPlatform(
      baseUrl,
      post.video.businessId,
      post.video.id,
      post.platform,
      post.video.duration,
    );

    const result = await publisher.publish({
      videoUrl,
      thumbnailUrl: post.thumbnailUrl,
      caption: post.caption ?? "",
      hashtags: post.hashtags,
      account,
    });

    const metrics = await publisher.fetchMetrics(result.externalPostId, account);
    const engagementRate =
      metrics.views > 0 ? (metrics.likes + metrics.comments + metrics.shares) / metrics.views : 0;

    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalPostId: result.externalPostId,
        analytics: {
          create: { ...metrics, engagementRate },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: (await userIdForPost(scheduledPostId)) ?? "",
        type: "PUBLISH_SUCCESS",
        title: "Post published",
        message: `Your video was published to ${post.platform}.`,
      },
    });

    logger.info({ scheduledPostId, platform: post.platform }, "publish: success");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: "FAILED", errorMessage: message },
    });
    logger.error({ scheduledPostId, err: message }, "publish: failed");
    throw err;
  }
}

async function userIdForPost(scheduledPostId: string): Promise<string | null> {
  const row = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    select: { video: { select: { business: { select: { userId: true } } } } },
  });
  return row?.video.business.userId ?? null;
}
