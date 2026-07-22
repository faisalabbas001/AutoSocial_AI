import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { basename, dirname } from "node:path";

/** The ffmpeg binary — overridable via FFMPEG_PATH for non-PATH installs. */
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
/** ffprobe ships with ffmpeg; overridable via FFPROBE_PATH. */
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

/**
 * Encode flags that guarantee the output plays in every browser and streams
 * progressively from object storage:
 *   - libx264 + yuv420p  → universally decodable (many phone cams shoot yuv444p
 *     / 10-bit, which browsers refuse to play)
 *   - +faststart         → moves the moov atom to the front so <video> can start
 *     before the whole file downloads (without this, playback stalls/blank)
 *   - veryfast preset    → keeps CPU/time (and therefore processing cost) low
 */
const WEB_VIDEO = [
  "-c:v", "libx264",
  "-preset", "veryfast",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
];
const WEB_AUDIO = ["-c:a", "aac", "-b:a", "128k"];

/** Resolve once whether an `ffmpeg` binary is available. */
let ffmpegAvailable: boolean | null = null;

export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  ffmpegAvailable = await run(FFMPEG, ["-version"])
    .then(() => true)
    .catch(() => false);
  return ffmpegAvailable;
}

function run(cmd: string, args: string[], opts?: { cwd?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "ignore", cwd: opts?.cwd });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function fileExists(path: string) {
  return access(path).then(() => true).catch(() => false);
}

/** Run a command and resolve with its captured stdout (rejects on non-zero). */
function capture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}`))));
  });
}

/**
 * Probe a media file's duration in whole seconds using ffprobe. Returns null if
 * ffprobe is unavailable or the value can't be read — callers keep any existing
 * (e.g. client-reported) duration in that case.
 */
export async function probeDuration(input: string): Promise<number | null> {
  try {
    const out = await capture(FFPROBE, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      input,
    ]);
    const seconds = Number(out.trim());
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  } catch {
    return null;
  }
}

/** Probe a video's pixel dimensions with ffprobe. Null if unavailable. */
export async function probeSize(input: string): Promise<{ width: number; height: number } | null> {
  try {
    const out = await capture(FFPROBE, [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      input,
    ]);
    const [w, h] = out.trim().split("x").map(Number);
    return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { width: w, height: h } : null;
  } catch {
    return null;
  }
}

/**
 * Build a libass `force_style` for readable, social-media-style burned captions.
 *
 * Values are tuned against libass's DEFAULT 288px script height (what ffmpeg uses
 * when converting an SRT): libass scales the whole style from that baseline up to
 * the real frame, so these fixed numbers give the SAME visual proportion on every
 * resolution — Fontsize 15 ≈ 5% of frame height whether the video is 480p or 4K.
 * (Do NOT add `original_size`; it doesn't reset PlayResY and just double-scales
 * the font into the oversized default we're trying to avoid.)
 *
 * Style = white bold text + thick black outline + soft shadow. The outline keeps
 * captions legible on ANY background (bright, dark, busy) without a box covering
 * the footage — i.e. the right treatment for any video, universally. Positioned
 * bottom-centre in the safe lower area, with side gutters so lines wrap cleanly
 * instead of sprawling edge-to-edge.
 */
export type CaptionPlacement = "top" | "bottom";

function subtitleStyle(placement: CaptionPlacement = "bottom"): string {
  // This libass build reads the style's Alignment as LEGACY SSA numbering, NOT
  // ASS numpad: bottom-centre = 2, top-centre = 6 (verified by rendering — the
  // ASS-numpad "8" lands in the middle of the frame). MarginV is measured from
  // the chosen edge, so one value keeps captions in the safe area either way.
  const alignment = placement === "top" ? 6 : 2;
  return [
    "FontName=DejaVu Sans",
    "Fontsize=15",
    "Bold=1",
    "PrimaryColour=&H00FFFFFF", // white text (ASS is &HAABBGGRR; AA=00 = opaque)
    "OutlineColour=&H00000000", // black outline
    "BorderStyle=1", // outline + drop shadow (NOT an opaque box)
    "Outline=2",
    "Shadow=1",
    `Alignment=${alignment}`,
    "MarginV=40", // clear the top/bottom edge (platform UI safe area)
    "MarginL=40",
    "MarginR=40", // side gutters → clean wrapping
  ].join(",");
}

/**
 * Remove silent gaps longer than `threshold` seconds.
 *
 * NOTE: `silenceremove` only trims the AUDIO stream. To keep audio and video in
 * sync we re-time the video with a matching PTS reset, but a perfectly synced
 * cut of both streams is non-trivial — so this step is OFF by default in the
 * pipeline (see ENABLE_SILENCE_REMOVAL in process-video). Kept here for when a
 * caller opts in. Requires ffmpeg; otherwise a no-op passthrough.
 */
export async function removeSilence(input: string, output: string, threshold = 1) {
  if (!(await hasFfmpeg())) return { skipped: true, output: input };
  await run(FFMPEG, [
    "-y", "-i", input,
    "-af", `silenceremove=stop_periods=-1:stop_duration=${threshold}:stop_threshold=-30dB`,
    ...WEB_VIDEO, ...WEB_AUDIO,
    output,
  ]);
  return { skipped: false, output };
}

/** Convert to vertical 9:16 with smart center crop. Re-encodes web-safe. */
export async function toVertical(input: string, output: string) {
  if (!(await hasFfmpeg())) return { skipped: true, output: input };
  await run(FFMPEG, [
    "-y", "-i", input,
    "-vf", "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=1080:1920,setsar=1",
    ...WEB_VIDEO, ...WEB_AUDIO,
    output,
  ]);
  return { skipped: false, output };
}

/**
 * Convert a video to a target WxH aspect ratio by scaling to cover and
 * center-cropping (no letterbox bars). Used to produce the correct ratio per
 * platform (e.g. 9:16 for Reels/TikTok/Shorts, 1:1 for LinkedIn). Web-safe.
 *
 * When `srtPath` is given (and exists), the subtitles are burned in AFTER the
 * crop/scale so they're sized to the final frame — one re-encode does both.
 */
export async function convertAspect(
  input: string,
  output: string,
  w: number,
  h: number,
  opts: {
    srtPath?: string;
    trimStart?: number | null;
    trimEnd?: number | null;
    placement?: CaptionPlacement;
  } = {},
) {
  if (!(await hasFfmpeg())) return { skipped: true, output: input, subtitled: false };
  const { srtPath, trimStart, trimEnd, placement = "bottom" } = opts;

  let vf = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`;
  let subtitled = false;
  let cwd: string | undefined;
  if (srtPath && (await fileExists(srtPath))) {
    // Reference the subtitle by filename with ffmpeg's cwd set to its folder, so
    // the drive-letter colon in a Windows path never reaches the filter parser.
    cwd = dirname(srtPath);
    // Reuse the shared style + placement so the published rendition matches the preview.
    vf += `,subtitles=${basename(srtPath)}:force_style='${subtitleStyle(placement)}'`;
    subtitled = true;
  }

  // Trim (in-point via fast input seek; duration via -t). Applied before crop so
  // only the kept segment is re-encoded. Callers pre-shift the SRT to match.
  const pre: string[] = [];
  const start = trimStart != null && trimStart > 0 ? trimStart : 0;
  if (start > 0) pre.push("-ss", String(start));
  const post: string[] = [];
  if (trimEnd != null && trimEnd > start) post.push("-t", String(trimEnd - start));

  await run(FFMPEG, ["-y", ...pre, "-i", input, ...post, "-vf", vf, ...WEB_VIDEO, ...WEB_AUDIO, output], { cwd });
  return { skipped: false, output, subtitled };
}

/**
 * Burn an SRT subtitle track into the video with clean, resolution-aware styling
 * (see subtitleStyle). Re-encodes web-safe.
 *
 * Reference the SRT by basename with ffmpeg's cwd set to its folder, so a
 * Windows drive-letter colon never reaches the filter parser. `original_size`
 * pins the style's pixel units to the real frame so captions aren't oversized.
 */
export async function burnSubtitles(
  input: string,
  srtPath: string,
  output: string,
  placement: CaptionPlacement = "bottom",
) {
  if (!(await hasFfmpeg()) || !(await fileExists(srtPath))) return { skipped: true, output: input };
  const vf = `subtitles=${basename(srtPath)}:force_style='${subtitleStyle(placement)}'`;
  await run(FFMPEG, ["-y", "-i", input, "-vf", vf, ...WEB_VIDEO, "-c:a", "copy", output], {
    cwd: dirname(srtPath),
  });
  return { skipped: false, output };
}

/** Overlay a logo watermark at the top-right. Re-encodes web-safe. */
export async function overlayLogo(input: string, logoPath: string, output: string) {
  if (!(await hasFfmpeg()) || !(await fileExists(logoPath))) return { skipped: true, output: input };
  await run(FFMPEG, [
    "-y", "-i", input, "-i", logoPath,
    "-filter_complex", "overlay=W-w-24:24",
    ...WEB_VIDEO, "-c:a", "copy",
    output,
  ]);
  return { skipped: false, output };
}

/**
 * Extract a compact mono audio track for transcription. Whisper only needs
 * audio, and a 16 kHz mono MP3 is a few MB regardless of the source video size —
 * which keeps us under transcription-API upload limits (Groq free tier ≈ 25 MB).
 */
export async function extractAudio(input: string, output: string) {
  if (!(await hasFfmpeg())) return { skipped: true, output: null };
  await run(FFMPEG, [
    "-y", "-i", input,
    "-vn",            // drop video
    "-ac", "1",       // mono
    "-ar", "16000",   // 16 kHz (Whisper's native rate)
    "-b:a", "64k",
    output,
  ]);
  return { skipped: false, output };
}

/** Extract a single thumbnail frame at the given timestamp (seconds). */
export async function extractThumbnail(input: string, output: string, atSeconds = 1) {
  if (!(await hasFfmpeg())) return { skipped: true, output: null };
  await run(FFMPEG, ["-y", "-ss", String(atSeconds), "-i", input, "-frames:v", "1", "-q:v", "2", output]);
  return { skipped: false, output };
}

/**
 * Extract `count` full-resolution candidate thumbnail frames spread across the
 * video (evenly spaced, skipping the very start/end which are often black), so
 * the reviewer can pick the most representative one. Returns the paths written.
 */
export async function extractThumbnails(
  input: string,
  outDir: string,
  count = 4,
  durationSeconds?: number | null,
): Promise<string[]> {
  if (!(await hasFfmpeg())) return [];

  const timestamps: number[] =
    durationSeconds && durationSeconds > 2
      ? Array.from({ length: count }, (_, i) =>
          // spread across ~10%..90% of the clip
          Math.max(0.5, Math.round((durationSeconds * (i + 1)) / (count + 1))),
        )
      : Array.from({ length: count }, (_, i) => i + 1); // 1s,2s,3s,4s fallback

  const paths: string[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const out = `${outDir}/thumb_${i}.jpg`;
    try {
      await run(FFMPEG, ["-y", "-ss", String(timestamps[i]), "-i", input, "-frames:v", "1", "-q:v", "2", out]);
      if (await fileExists(out)) paths.push(out);
    } catch {
      /* timestamp past the end — skip */
    }
  }
  return paths;
}

/**
 * Extract `count` keyframes spread across the video for visual analysis.
 * Frames are sampled at even fractions of the duration (or fixed early
 * timestamps when duration is unknown), downscaled to keep the base64 payload
 * small. Returns the paths of frames actually written. No-op without ffmpeg.
 */
export async function extractKeyframes(
  input: string,
  outDir: string,
  count = 3,
  durationSeconds?: number | null,
): Promise<string[]> {
  if (!(await hasFfmpeg())) return [];

  const timestamps: number[] =
    durationSeconds && durationSeconds > 1
      ? Array.from({ length: count }, (_, i) =>
          Math.max(0.5, Math.round((durationSeconds * (i + 1)) / (count + 1))),
        )
      : Array.from({ length: count }, (_, i) => i + 1); // 1s, 2s, 3s fallback

  const paths: string[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const out = `${outDir}/frame_${i}.jpg`;
    try {
      await run(FFMPEG, [
        "-y", "-ss", String(timestamps[i]), "-i", input,
        "-frames:v", "1",
        "-vf", "scale='min(512,iw)':-2", // cap width at 512px (keeps vision tokens low)
        "-q:v", "4",
        out,
      ]);
      if (await fileExists(out)) paths.push(out);
    } catch {
      // A timestamp past the end just yields no frame — skip it.
    }
  }
  return paths;
}
