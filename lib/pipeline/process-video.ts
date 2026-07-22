import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { transcribe } from "@/lib/ai/whisper";
import { analyzeVisual } from "@/lib/ai/vision";
import { generateCaptions } from "@/lib/ai/caption";
import { generateAllHashtags } from "@/lib/ai/hashtag";
import {
  hasFfmpeg,
  removeSilence,
  toVertical,
  burnSubtitles,
  overlayLogo,
  extractThumbnail,
  extractKeyframes,
} from "@/lib/media/ffmpeg";
import { putObject } from "@/lib/storage";
import type { JobType, Platform } from "@prisma/client";

/**
 * Silence removal only trims the audio stream, which drifts audio out of sync
 * with the (untrimmed) video. It's therefore OFF by default so processed videos
 * always play back correctly. Opt in with ENABLE_SILENCE_REMOVAL=true.
 */
const SILENCE_REMOVAL_ENABLED = process.env.ENABLE_SILENCE_REMOVAL === "true";

/**
 * Runs the full AI processing pipeline for a video, recording each step as a
 * VideoJob row so the UI can show live progress.
 *
 * When an `ffmpeg` binary and a source file are available, media steps run for
 * real (silence removal → vertical crop → subtitle burn → logo → thumbnail) and
 * the processed video + extracted thumbnail are uploaded to object storage.
 * Otherwise those steps are recorded as `skipped` and the pipeline still
 * completes, so it stays exercisable in any environment.
 */
export async function processVideo(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { business: true },
  });
  if (!video) throw new Error(`Video ${videoId} not found`);

  await prisma.video.update({ where: { id: videoId }, data: { status: "PROCESSING" } });
  logger.info({ videoId }, "pipeline: start");

  const workDir = await mkdtemp(join(tmpdir(), `autosocial-${videoId.slice(0, 8)}-`));
  const ffmpegReady = await hasFfmpeg();
  let processedUrl = video.originalUrl;

  try {
    // Download the source file once; reused for transcription + all media ops.
    let sourcePath: string | null = null;
    if (video.originalUrl?.startsWith("http")) {
      sourcePath = join(workDir, "source" + extOf(video.originalUrl));
      await downloadTo(video.originalUrl, sourcePath).catch(() => (sourcePath = null));
    }

    // 1. Transcribe (Whisper) — also yields an SRT track for subtitle burning.
    let srtPath: string | null = null;
    let language = "en";
    await step(videoId, "TRANSCRIBE", async () => {
      const t = await transcribe(sourcePath ?? "");
      language = t.language || "en";
      await prisma.video.update({ where: { id: videoId }, data: { transcript: t.text } });
      if (t.srt) {
        srtPath = join(workDir, "subs.srt");
        await writeFile(srtPath, t.srt);
      }
      return { language, chars: t.text.length, source: sourcePath ? "file" : "mock" };
    });

    const transcriptText =
      (await prisma.video.findUnique({ where: { id: videoId } }))?.transcript ?? "";

    // 1b. Analyse what the video VISUALLY shows (sampled keyframes → vision model).
    // This is what makes captions/hashtags match the real content even with no
    // speech. Requires ffmpeg (to sample frames) + an AI key; best-effort otherwise.
    let visual = "";
    await step(videoId, "ANALYZE", async () => {
      if (!ffmpegReady || !sourcePath) return { skipped: true, reason: "no ffmpeg/source" };
      const framePaths = await extractKeyframes(sourcePath, workDir, 2, video.duration);
      if (framePaths.length === 0) return { skipped: true, reason: "no frames" };
      const frames = await Promise.all(framePaths.map((p) => readFile(p)));
      visual = await analyzeVisual({
        frames,
        industry: video.business.industry,
        businessName: video.business.name,
      });
      return { frames: framePaths.length, chars: visual.length, description: visual };
    });

    // Track the "current" working file as it passes through each ffmpeg stage.
    let currentPath = sourcePath;
    let ranFfmpeg = false;

    // 2. Subtitle track (SRT already written above)
    await step(videoId, "SUBTITLE", async () => ({ generated: Boolean(srtPath) }));

    // 3. Silence removal (off by default — keeps audio/video in sync)
    await step(videoId, "SILENCE_REMOVAL", async () => {
      if (!SILENCE_REMOVAL_ENABLED) return { skipped: true, reason: "disabled (A/V sync)" };
      if (!ffmpegReady || !currentPath) return { skipped: true };
      const out = join(workDir, "nosilence.mp4");
      const r = await removeSilence(currentPath, out);
      if (!r.skipped) {
        currentPath = out;
        ranFfmpeg = true;
      }
      return { skipped: r.skipped };
    });

    // 4. Edit: vertical crop → subtitle burn → logo overlay
    await step(videoId, "EDIT", async () => {
      if (!ffmpegReady || !currentPath) return { skipped: true };
      let p = currentPath;

      const vOut = join(workDir, "vertical.mp4");
      const v = await toVertical(p, vOut);
      if (!v.skipped) p = vOut;

      let subtitled = false;
      if (srtPath) {
        const sOut = join(workDir, "subbed.mp4");
        const s = await burnSubtitles(p, srtPath, sOut);
        if (!s.skipped) {
          p = sOut;
          subtitled = true;
        }
      }

      let logoed = false;
      if (video.business.logoUrl?.startsWith("http")) {
        const logoPath = join(workDir, "logo.png");
        if (await downloadTo(video.business.logoUrl, logoPath).then(() => true).catch(() => false)) {
          const lOut = join(workDir, "logo-out.mp4");
          const l = await overlayLogo(p, logoPath, lOut);
          if (!l.skipped) {
            p = lOut;
            logoed = true;
          }
        }
      }

      currentPath = p;
      ranFfmpeg = true;
      return { vertical: !v.skipped, subtitles: subtitled, logo: logoed };
    });

    // Upload the processed video (only if ffmpeg actually produced a new file).
    if (ranFfmpeg && currentPath && currentPath !== sourcePath) {
      const buf = await readFile(currentPath);
      processedUrl = await putObject(`processed/${video.businessId}/${videoId}.mp4`, buf, "video/mp4");
    }

    // 5. Thumbnail — extract a real frame when possible, else a placeholder.
    await step(videoId, "THUMBNAIL", async () => {
      let url = `https://picsum.photos/seed/${videoId}/1080/1920`;
      let real = false;
      if (ffmpegReady && currentPath) {
        const thumbPath = join(workDir, "thumb.jpg");
        const r = await extractThumbnail(currentPath, thumbPath, 1);
        if (!r.skipped) {
          const buf = await readFile(thumbPath);
          url = await putObject(`thumbnails/${videoId}.jpg`, buf, "image/jpeg");
          real = true;
        }
      }
      await prisma.thumbnail.deleteMany({ where: { videoId } });
      await prisma.thumbnail.create({ data: { videoId, url, isPrimary: true } });
      return { real };
    });

    // 6. Captions — one batched, language-aware model call for all platforms.
    await step(videoId, "CAPTION", async () => {
      const captions = await generateCaptions({
        transcript: transcriptText,
        visual,
        industry: video.business.industry,
        businessName: video.business.name,
        language,
      });
      // Idempotent: clear any prior run's captions before writing fresh ones.
      await prisma.caption.deleteMany({ where: { videoId } });
      await prisma.caption.createMany({
        data: Object.entries(captions).map(([platform, text]) => ({
          videoId,
          platform: platform as Platform,
          text,
        })),
      });
      return { platforms: Object.keys(captions).length, language };
    });

    // 7. Hashtags — one batched model call for all platforms.
    await step(videoId, "HASHTAG", async () => {
      const hashtags = await generateAllHashtags({
        transcript: transcriptText,
        visual,
        industry: video.business.industry,
      });
      await prisma.hashtag.deleteMany({ where: { videoId } });
      await prisma.hashtag.createMany({
        data: Object.entries(hashtags).map(([platform, tags]) => ({
          videoId,
          platform: platform as Platform,
          tags,
        })),
      });
      return { platforms: Object.keys(hashtags).length };
    });

    await prisma.video.update({
      where: { id: videoId },
      data: { status: "READY", processedUrl },
    });

    await prisma.notification.create({
      data: {
        userId: video.business.userId,
        type: "PROCESSING_COMPLETE",
        title: "Video ready for review",
        message: `"${video.title}" has finished processing and is ready to publish.`,
      },
    });

    logger.info({ videoId, ranFfmpeg }, "pipeline: complete");
    return { videoId, status: "READY" as const };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function extOf(url: string): string {
  const ext = url.split("/").pop()?.split("?")[0]?.split(".").pop();
  return ext && ext.length <= 5 ? `.${ext}` : ".mp4";
}

/** Download a remote object to a specific local path. */
async function downloadTo(url: string, path: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

/** Wrap a pipeline step in a VideoJob record with timing + error capture. */
async function step<T>(videoId: string, jobType: JobType, fn: () => Promise<T>): Promise<T> {
  const job = await prisma.videoJob.create({
    data: { videoId, jobType, status: "RUNNING", startedAt: new Date() },
  });
  try {
    const result = await fn();
    await prisma.videoJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", processedAt: new Date(), result: result as object },
    });
    logger.debug({ videoId, jobType }, "step complete");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.videoJob.update({
      where: { id: job.id },
      data: { status: "FAILED", processedAt: new Date(), errorMessage: message },
    });
    logger.error({ videoId, jobType, err: message }, "step failed");
    throw err;
  }
}
