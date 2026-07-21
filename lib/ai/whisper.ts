import fs from "node:fs";
import { openai } from "./client";

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
  const ai = openai();
  if (!ai) return mockTranscript();

  const res = await ai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-1",
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
