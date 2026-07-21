import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPublisher } from "@/lib/social";

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
    const result = await publisher.publish({
      videoUrl: post.video.processedUrl ?? post.video.originalUrl ?? "",
      thumbnailUrl: post.thumbnailUrl,
      caption: post.caption ?? "",
      hashtags: post.hashtags,
      accessToken: post.socialAccount.accessToken,
    });

    const metrics = await publisher.fetchMetrics(result.externalPostId, post.socialAccount.accessToken);
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
