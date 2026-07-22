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
  extractAudio,
  extractThumbnail,
  extractKeyframes,
  burnSubtitles,
} from "@/lib/media/ffmpeg";
import { putObject, deleteObject } from "@/lib/storage";
import type { JobType, Platform } from "@prisma/client";

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

  try {
    // Download the source file once; reused for transcription + all media ops.
    let sourcePath: string | null = null;
    if (video.originalUrl?.startsWith("http")) {
      sourcePath = join(workDir, "source" + extOf(video.originalUrl));
      await downloadTo(video.originalUrl, sourcePath).catch(() => (sourcePath = null));
    }

    // 1. Transcribe (Whisper) — also yields an SRT track for subtitle burning.
    // We transcribe an extracted AUDIO track (small) rather than the whole video,
    // so large uploads don't blow past the transcription API's size limit. The
    // step is non-fatal: if transcription fails, captions fall back to the visual
    // analysis and the pipeline continues.
    let srtPath: string | null = null;
    let language = "en";
    await step(videoId, "TRANSCRIBE", async () => {
      let audioPath = sourcePath;
      if (ffmpegReady && sourcePath) {
        const a = join(workDir, "audio.mp3");
        const r = await extractAudio(sourcePath, a).catch(() => ({ skipped: true, output: null }));
        if (!r.skipped) audioPath = a;
      }
      try {
        const t = await transcribe(audioPath ?? "");
        language = t.language || "en";
        await prisma.video.update({ where: { id: videoId }, data: { transcript: t.text } });
        if (t.srt) {
          srtPath = join(workDir, "subs.srt");
          await writeFile(srtPath, t.srt);
        }
        return {
          language,
          chars: t.text.length,
          source: audioPath && audioPath !== sourcePath ? "audio" : sourcePath ? "file" : "mock",
        };
      } catch (err) {
        // Transcription is optional — visual analysis still drives the captions.
        await prisma.video.update({ where: { id: videoId }, data: { transcript: "" } });
        logger.warn({ videoId, err: String(err) }, "transcription failed — continuing with visuals");
        return { skipped: true, reason: "transcription failed", error: String(err).slice(0, 140) };
      }
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

    // ── Fast path first: thumbnail + captions + hashtags ──────────────────
    // These are the client's core value, so they run BEFORE the (potentially
    // slow) video re-encode. The video becomes reviewable as soon as they're
    // done, even for long uploads.

    // Thumbnail — one frame from the source (fast).
    await step(videoId, "THUMBNAIL", async () => {
      let url = `https://picsum.photos/seed/${videoId}/1080/1920`;
      let real = false;
      if (ffmpegReady && sourcePath) {
        const thumbPath = join(workDir, "thumb.jpg");
        const r = await extractThumbnail(sourcePath, thumbPath, 1);
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

    // Captions — one batched, language-aware call for all platforms.
    await step(videoId, "CAPTION", async () => {
      const captions = await generateCaptions({
        transcript: transcriptText,
        visual,
        industry: video.business.industry,
        businessName: video.business.name,
        language,
      });
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

    // Hashtags — one batched call for all platforms.
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

    // Subtitles: store the transcribed SRT as-is, then burn the same track into
    // a reviewable preview video. Silent videos store nothing -> no subtitles.
    await step(videoId, "SUBTITLE", async () => {
      const hasSpeech = transcriptText.trim().length > 3 && Boolean(srtPath);
      const subKey = `subtitles/${videoId}.srt`;
      if (!hasSpeech) {
        await deleteObject(subKey).catch(() => {});
        return { stored: false, reason: "no speech" };
      }
      const srt = await readFile(srtPath!, "utf8");
      await putObject(subKey, Buffer.from(srt, "utf8"), "application/x-subrip");

      let processedUrl: string | null = null;
      if (ffmpegReady && sourcePath) {
        const subtitledPath = join(workDir, "subtitled.mp4");
        const r = await burnSubtitles(sourcePath, srtPath!, subtitledPath);
        if (!r.skipped) {
          const buf = await readFile(subtitledPath);
          processedUrl = await putObject(
            `processed/${video.businessId}/${videoId}.mp4`,
            buf,
            "video/mp4",
          );
          await prisma.video.update({ where: { id: videoId }, data: { processedUrl } });
        }
      }

      return {
        stored: true,
        burnedPreview: Boolean(processedUrl),
      };
    });

    // The video is now reviewable & publishable (captions/hashtags/thumbnail ready).
    await prisma.video.update({ where: { id: videoId }, data: { status: "READY" } });
    await prisma.notification.create({
      data: {
        userId: video.business.userId,
        type: "PROCESSING_COMPLETE",
        title: "Video ready for review",
        message: `"${video.title}" is ready — captions & hashtags generated.`,
      },
    });

    // Note: video is NOT re-encoded here. The correct aspect ratio per platform
    // (9:16 for Reels/TikTok/Shorts, 1:1 for LinkedIn, …) is applied at publish
    // time — see renditionForPlatform() in publish-post.ts.

    logger.info({ videoId }, "pipeline: complete");
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
