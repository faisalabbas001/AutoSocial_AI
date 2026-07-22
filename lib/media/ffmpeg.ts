import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

/** The ffmpeg binary — overridable via FFMPEG_PATH for non-PATH installs. */
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

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

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function fileExists(path: string) {
  return access(path).then(() => true).catch(() => false);
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

/** Burn an SRT subtitle track into the video. Re-encodes web-safe. */
export async function burnSubtitles(input: string, srtPath: string, output: string) {
  if (!(await hasFfmpeg()) || !(await fileExists(srtPath))) return { skipped: true, output: input };
  // The subtitles filter needs forward slashes and an escaped drive-letter colon
  // on Windows (e.g. C:/path -> C\:/path).
  const escaped = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  await run(FFMPEG, [
    "-y", "-i", input,
    "-vf", `subtitles='${escaped}'`,
    ...WEB_VIDEO, "-c:a", "copy",
    output,
  ]);
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

/** Extract a thumbnail frame at the given timestamp (seconds). */
export async function extractThumbnail(input: string, output: string, atSeconds = 1) {
  if (!(await hasFfmpeg())) return { skipped: true, output: null };
  await run(FFMPEG, ["-y", "-ss", String(atSeconds), "-i", input, "-frames:v", "1", "-q:v", "2", output]);
  return { skipped: false, output };
}
