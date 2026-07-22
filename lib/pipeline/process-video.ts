import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { transcribe, chunkSrt } from "@/lib/ai/whisper";
import { analyzeVisual } from "@/lib/ai/vision";
import { generateCaptions } from "@/lib/ai/caption";
import { generateAllHashtags } from "@/lib/ai/hashtag";
import {
  hasFfmpeg,
  probeDuration,
  probeSize,
  extractAudio,
  extractThumbnails,
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

    // Duration accuracy: the browser-reported value can be missing/wrong for some
    // codecs. When we have the file + ffprobe, probe the real duration and persist
    // it (backfilling null and correcting bad values) so keyframe sampling, the
    // re-encode guard, and the UI all use the true length.
    let duration = video.duration;
    if (ffmpegReady && sourcePath) {
      const [probed, size] = await Promise.all([probeDuration(sourcePath), probeSize(sourcePath)]);
      const data: { duration?: number; width?: number; height?: number } = {};
      if (probed && probed !== duration) {
        duration = probed;
        data.duration = probed;
      }
      if (size) {
        data.width = size.width;
        data.height = size.height;
      }
      if (Object.keys(data).length > 0) {
        await prisma.video.update({ where: { id: videoId }, data });
      }
    }

    // 1. Transcribe (Whisper) — also yields an SRT track for subtitle burning.
    // We transcribe an extracted AUDIO track (small) rather than the whole video,
    // so large uploads don't blow past the transcription API's size limit. The
    // step is non-fatal: if transcription fails, captions fall back to the visual
    // analysis and the pipeline continues.
    let srtPath: string | null = null;
    let language = "en";
    let visual = "";
    // Where burned captions should sit for THIS video, decided by the vision model
    // in the ANALYZE step so text never covers the subject. Safe default: bottom.
    let captionPlacement: "top" | "bottom" = "bottom";

    // Transcription (audio → Whisper) and visual analysis (keyframes → vision) are
    // independent, so run them CONCURRENTLY to cut ~5-10s off time-to-captions.
    await Promise.all([
      step(videoId, "TRANSCRIBE", async () => {
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
          // Split long segments into short, readable cues before burning/storing.
          await writeFile(srtPath, chunkSrt(t.srt));
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
      }),

      // 1b. Analyse what the video VISUALLY shows (sampled keyframes → vision model).
      // This is what makes captions/hashtags match the real content even with no
      // speech. Requires ffmpeg (to sample frames) + an AI key; best-effort otherwise.
      step(videoId, "ANALYZE", async () => {
      if (!ffmpegReady || !sourcePath) return { skipped: true, reason: "no ffmpeg/source" };
      try {
        const framePaths = await extractKeyframes(sourcePath, workDir, 2, duration);
        if (framePaths.length === 0) return { skipped: true, reason: "no frames" };
        const frames = await Promise.all(framePaths.map((p) => readFile(p)));
        const analysis = await analyzeVisual({
          frames,
          industry: video.business.industry,
          businessName: video.business.name,
        });
        visual = analysis.description;
        captionPlacement = analysis.captionPlacement;
        // Persist placement in the job result so the publish step can reuse the
        // exact same decision without re-analysing the video.
        return {
          frames: framePaths.length,
          chars: visual.length,
          description: visual,
          captionPlacement,
        };
      } catch (err) {
        // Visual analysis only *enriches* captions/hashtags — it must never abort
        // the pipeline, or the client loses their core deliverable. Degrade to "".
        visual = "";
        logger.warn({ videoId, err: String(err) }, "visual analysis failed — continuing without it");
        return { skipped: true, reason: "analysis failed", error: String(err).slice(0, 140) };
      }
      }),
    ]);

    const transcriptText =
      (await prisma.video.findUnique({ where: { id: videoId } }))?.transcript ?? "";

    // ── Fast path first: thumbnail + captions + hashtags ──────────────────
    // These are the client's core value, so they run BEFORE the (potentially
    // slow) video re-encode. The video becomes reviewable as soon as they're
    // done, even for long uploads.

    // Thumbnails — several real candidate frames sampled across the video so the
    // reviewer can pick the most accurate one. No random stock fallback: if a
    // frame can't be extracted we store a neutral branded placeholder instead of
    // an unrelated stock photo.
    await step(videoId, "THUMBNAIL", async () => {
      const urls: string[] = [];
      if (ffmpegReady && sourcePath) {
        const framePaths = await extractThumbnails(sourcePath, workDir, 4, duration);
        for (let i = 0; i < framePaths.length; i++) {
          const buf = await readFile(framePaths[i]);
          urls.push(await putObject(`thumbnails/${videoId}/${i}.jpg`, buf, "image/jpeg"));
        }
      }
      if (urls.length === 0) {
        // No frames available (no ffmpeg/source) — a neutral placeholder, never a
        // misleading unrelated image.
        const svg = placeholderSvg(video.business.name);
        urls.push(await putObject(`thumbnails/${videoId}/placeholder.svg`, Buffer.from(svg), "image/svg+xml"));
      }
      await prisma.thumbnail.deleteMany({ where: { videoId } });
      await prisma.thumbnail.createMany({
        data: urls.map((url, i) => ({ videoId, url, isPrimary: i === 0 })),
      });
      return { candidates: urls.length, real: ffmpegReady && Boolean(sourcePath) };
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

    // ── The client's core value (captions + hashtags + thumbnail) is now done.
    // Mark the video READY *here*, BEFORE the slow subtitle re-encode below, so
    // the review screen is usable in ~seconds instead of waiting on a full video
    // re-encode. The subtitle burn continues afterwards and swaps in the
    // subtitled preview (processedUrl) when it finishes.
    await prisma.video.update({ where: { id: videoId }, data: { status: "READY" } });
    await prisma.notification.create({
      data: {
        userId: video.business.userId,
        type: "PROCESSING_COMPLETE",
        title: "Video ready for review",
        message: `"${video.title}" is ready — captions & hashtags generated.`,
      },
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
        const r = await burnSubtitles(sourcePath, srtPath!, subtitledPath, captionPlacement);
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

    // Note: video is NOT re-encoded here. The correct aspect ratio per platform
    // (9:16 for Reels/TikTok/Shorts, 1:1 for LinkedIn, …) is applied at publish
    // time — see renditionForPlatform() in publish-post.ts.

    logger.info({ videoId }, "pipeline: complete");
    return { videoId, status: "READY" as const };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** A neutral, on-brand vertical placeholder used only when no frame can be extracted. */
function placeholderSvg(businessName: string): string {
  const label = (businessName || "Video").slice(0, 40).replace(/[<&>]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#312e81"/>
  </linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#g)"/>
  <text x="540" y="980" fill="#ffffff" font-family="system-ui,sans-serif" font-size="64"
    font-weight="600" text-anchor="middle">${label}</text>
</svg>`;
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
