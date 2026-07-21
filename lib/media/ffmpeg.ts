import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

/** The ffmpeg binary — overridable via FFMPEG_PATH for non-PATH installs. */
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

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
 * See README "Silence Removal". Requires ffmpeg; otherwise a no-op passthrough.
 */
export async function removeSilence(input: string, output: string, threshold = 1) {
  if (!(await hasFfmpeg())) return { skipped: true, output: input };
  await run(FFMPEG, [
    "-y", "-i", input,
    "-af", `silenceremove=stop_periods=-1:stop_duration=${threshold}:stop_threshold=-30dB`,
    output,
  ]);
  return { skipped: false, output };
}

/** Convert to vertical 9:16 with smart center crop. */
export async function toVertical(input: string, output: string) {
  if (!(await hasFfmpeg())) return { skipped: true, output: input };
  await run(FFMPEG, [
    "-y", "-i", input,
    "-vf", "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=1080:1920",
    "-c:a", "copy",
    output,
  ]);
  return { skipped: false, output };
}

/** Burn an SRT subtitle track into the video. */
export async function burnSubtitles(input: string, srtPath: string, output: string) {
  if (!(await hasFfmpeg()) || !(await fileExists(srtPath))) return { skipped: true, output: input };
  // The subtitles filter needs forward slashes and an escaped drive-letter colon
  // on Windows (e.g. C:/path -> C\:/path).
  const escaped = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  await run(FFMPEG, ["-y", "-i", input, "-vf", `subtitles='${escaped}'`, output]);
  return { skipped: false, output };
}

/** Overlay a logo watermark at the top-right. */
export async function overlayLogo(input: string, logoPath: string, output: string) {
  if (!(await hasFfmpeg()) || !(await fileExists(logoPath))) return { skipped: true, output: input };
  await run(FFMPEG, [
    "-y", "-i", input, "-i", logoPath,
    "-filter_complex", "overlay=W-w-24:24",
    output,
  ]);
  return { skipped: false, output };
}

/** Extract a thumbnail frame at the given timestamp (seconds). */
export async function extractThumbnail(input: string, output: string, atSeconds = 1) {
  if (!(await hasFfmpeg())) return { skipped: true, output: null };
  await run(FFMPEG, ["-y", "-ss", String(atSeconds), "-i", input, "-frames:v", "1", output]);
  return { skipped: false, output };
}
