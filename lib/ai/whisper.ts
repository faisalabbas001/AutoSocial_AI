import fs from "node:fs";
import { aiClient, aiModels } from "./client";

export interface TranscriptResult {
  text: string;
  /** SRT-formatted subtitle track. */
  srt: string;
  language: string;
}

/**
 * Transcribe a local audio/video file with OpenAI Whisper.
 * Falls back to a deterministic mock when no API key is present.
 */
export async function transcribe(filePath: string): Promise<TranscriptResult> {
  const ai = aiClient();
  if (!ai) return mockTranscript();

  // Guard the read stream: if the file is missing/empty, createReadStream emits an
  // async 'error' event with no listener yet, which crashes the whole worker
  // process. Throw a normal Error instead so the pipeline's TRANSCRIBE step catches
  // it and falls back to visual-only captions.
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    throw new Error(`transcription source missing or empty: ${filePath || "(none)"}`);
  }

  const res = await ai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: aiModels().transcribe,
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const segments = (res as unknown as { segments?: Segment[] }).segments ?? [];
  return {
    text: res.text,
    srt: toSrt(segments),
    language: (res as unknown as { language?: string }).language ?? "en",
  };
}

interface Segment {
  start: number;
  end: number;
  text: string;
}

function toSrt(segments: Segment[]): string {
  return segments
    .map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${s.text.trim()}\n`)
    .join("\n");
}

function ts(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  const p = (n: number, l = 2) => n.toString().padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`;
}

/**
 * Split any over-long SRT cue into shorter pieces (≈2 lines each), sharing the
 * cue's time window proportionally. Whisper returns segment-level cues that can
 * be a whole sentence — burned in, those wrap to 4-5 lines and swamp the frame.
 * Chunking keeps captions to short, fast-changing, readable snippets like real
 * caption tools. Already-short cues pass through unchanged.
 *
 * maxChars is tuned for VERTICAL 9:16 video (the social default): the font is
 * sized to frame HEIGHT, so a narrow 9:16 frame only fits ~15 chars per line —
 * ~32 chars keeps each cue to ≈2 lines. Landscape simply gets shorter cues.
 */
export function chunkSrt(srt: string, maxChars = 32): string {
  const toMs = (t: string): number => {
    const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000 + +m[4] : 0;
  };
  const fmtMs = (ms: number): string => {
    const c = Math.max(0, Math.round(ms));
    const p = (n: number, l = 2) => n.toString().padStart(l, "0");
    return `${p(Math.floor(c / 3600000))}:${p(Math.floor((c % 3600000) / 60000))}:${p(
      Math.floor((c % 60000) / 1000),
    )},${p(c % 1000, 3)}`;
  };

  const out: string[] = [];
  let idx = 1;
  for (const block of srt.split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean)) {
    const lines = block.split(/\r?\n/);
    const tsIdx = lines.findIndex((l) => l.includes("-->"));
    const tsm = tsIdx >= 0 ? lines[tsIdx].match(/([\d:,.]+)\s*-->\s*([\d:,.]+)/) : null;
    if (!tsm) continue;
    const start = toMs(tsm[1]);
    const end = toMs(tsm[2]);
    const text = lines.slice(tsIdx + 1).join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;

    // Greedily pack words into ≤maxChars pieces.
    const pieces: string[] = [];
    let cur = "";
    for (const w of text.split(" ")) {
      if (cur && cur.length + 1 + w.length > maxChars) {
        pieces.push(cur);
        cur = w;
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
    if (cur) pieces.push(cur);

    const totalLen = pieces.reduce((s, p) => s + p.length, 0) || 1;
    let cursor = start;
    for (const piece of pieces) {
      const pEnd = pieces.length === 1 ? end : Math.min(end, cursor + (piece.length / totalLen) * (end - start));
      out.push(`${idx++}\n${fmtMs(cursor)} --> ${fmtMs(pEnd)}\n${piece}`);
      cursor = pEnd;
    }
  }
  return out.length ? out.join("\n\n") + "\n" : srt;
}

function mockTranscript(): TranscriptResult {
  const text =
    "Welcome to our clinic. Today we're showing you an amazing transformation. " +
    "Book your appointment now and see the difference for yourself.";
  return {
    text,
    srt: "1\n00:00:00,000 --> 00:00:03,000\nWelcome to our clinic.\n\n2\n00:00:03,000 --> 00:00:07,000\nBook your appointment now.\n",
    language: "en",
  };
}
