import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPublisher } from "@/lib/social";
import { hasFfmpeg, convertAspect } from "@/lib/media/ffmpeg";
import { PLATFORM_ASPECT } from "@/lib/media/aspect";
import { putObject, publicUrl } from "@/lib/storage";
import type { Platform } from "@prisma/client";

/**
 * Produce a version of the video in the target platform's aspect ratio
 * (e.g. 9:16 for Reels/TikTok/Shorts, 1:1 for LinkedIn) and return its URL.
 * Falls back to the original when ffmpeg is unavailable, the clip is very long,
 * or conversion fails — so publishing never blocks on it.
 */
interface RenditionEdits {
  subtitlesEnabled: boolean;
  trimStart: number | null;
  trimEnd: number | null;
}

async function renditionForPlatform(
  videoUrl: string,
  businessId: string,
  videoId: string,
  platform: Platform,
  durationSeconds: number | null,
  edits: RenditionEdits,
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

    // Fetch the stored subtitle track (only when the reviewer left subtitles on
    // and the video had speech). When trimming, shift cue times to stay in sync.
    let srtPath: string | undefined;
    if (edits.subtitlesEnabled) {
      try {
        const subRes = await fetch(publicUrl(`subtitles/${videoId}.srt`));
        if (subRes.ok) {
          let text = await subRes.text();
          if (edits.trimStart && edits.trimStart > 0) text = shiftSrt(text, edits.trimStart);
          if (text.trim()) {
            srtPath = join(workDir, "subs.srt");
            await writeFile(srtPath, text);
          }
        }
      } catch {
        /* no subtitles — publish without them */
      }
    }

    // Reuse the caption placement the ANALYZE step decided for this video, so the
    // published rendition puts subtitles in the same safe area as the preview.
    const analyzeJob = await prisma.videoJob.findFirst({
      where: { videoId, jobType: "ANALYZE", status: "COMPLETED" },
      orderBy: { processedAt: "desc" },
      select: { result: true },
    });
    const placement =
      (analyzeJob?.result as { captionPlacement?: string } | null)?.captionPlacement === "top"
        ? "top"
        : "bottom";

    const out = join(workDir, "out.mp4");
    const r = await convertAspect(src, out, dims.w, dims.h, {
      srtPath,
      trimStart: edits.trimStart,
      trimEnd: edits.trimEnd,
      placement,
    });
    if (r.skipped) return videoUrl;

    const buf = await readFile(out);
    const url = await putObject(
      `renditions/${businessId}/${videoId}/${platform.toLowerCase()}.mp4`,
      buf,
      "video/mp4",
    );
    logger.info({ videoId, platform, ratio: dims.label, subtitled: r.subtitled }, "publish: rendition ready");
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
      accountId: post.socialAccount.accountId,
      accessToken: post.socialAccount.accessToken,
      refreshToken: post.socialAccount.refreshToken,
      expiresAt: post.socialAccount.expiresAt,
    };
    // Frame the video to the platform's required aspect ratio before uploading.
    // When the reviewer trimmed or turned subtitles off, start from the ORIGINAL
    // (the processed preview already has subtitles burned in and can't be undone).
    const edits: RenditionEdits = {
      subtitlesEnabled: post.video.subtitlesEnabled,
      trimStart: post.video.trimStart,
      trimEnd: post.video.trimEnd,
    };
    const hasEdits = edits.trimStart != null || edits.trimEnd != null || !edits.subtitlesEnabled;
    const baseUrl =
      (hasEdits ? post.video.originalUrl : post.video.processedUrl ?? post.video.originalUrl) ?? "";
    const videoUrl = await renditionForPlatform(
      baseUrl,
      post.video.businessId,
      post.video.id,
      post.platform,
      post.video.duration,
      edits,
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

/**
 * Shift all SRT cue timestamps earlier by `seconds` (for trimmed renditions),
 * dropping cues that fall entirely before the new start. Keeps burned subtitles
 * aligned with the trimmed video.
 */
function shiftSrt(srt: string, seconds: number): string {
  const shiftMs = seconds * 1000;
  const toMs = (t: string) => {
    const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) return 0;
    return (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000 + +m[4];
  };
  const fmt = (ms: number) => {
    const clamped = Math.max(0, ms);
    const h = Math.floor(clamped / 3600000);
    const min = Math.floor((clamped % 3600000) / 60000);
    const s = Math.floor((clamped % 60000) / 1000);
    const msPart = clamped % 1000;
    const p = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${p(h)}:${p(min)}:${p(s)},${p(msPart, 3)}`;
  };

  return srt
    .split(/\r?\n\r?\n/)
    .map((block) => {
      const line = block.match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/);
      if (!line) return block;
      const start = toMs(line[1]) - shiftMs;
      const end = toMs(line[2]) - shiftMs;
      if (end <= 0) return null; // cue is entirely before the new start
      return block.replace(line[0], `${fmt(start)} --> ${fmt(end)}`);
    })
    .filter((b): b is string => b !== null)
    .join("\n\n");
}

async function userIdForPost(scheduledPostId: string): Promise<string | null> {
  const row = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    select: { video: { select: { business: { select: { userId: true } } } } },
  });
  return row?.video.business.userId ?? null;
}
