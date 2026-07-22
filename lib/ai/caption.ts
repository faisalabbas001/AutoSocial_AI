import { aiClient, aiModels } from "./client";
import type OpenAI from "openai";

export type CaptionPlatform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "LINKEDIN";

export const CAPTION_PLATFORMS: CaptionPlatform[] = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "LINKEDIN",
];

export interface CaptionsInput {
  transcript: string;
  /** Vision-model description of what the video/image visually shows. */
  visual?: string | null;
  industry?: string | null;
  businessName?: string | null;
  /** Whisper-detected language code (e.g. "en", "ur", "hi"), used as a hint. */
  language?: string | null;
}

const STYLE: Record<CaptionPlatform, string> = {
  INSTAGRAM: "emotional, story-driven, with line breaks and 2-4 emoji",
  TIKTOK: "short, punchy, trend-aware, with a strong hook in the first line",
  YOUTUBE: "SEO-friendly description with keywords and a clear title-style first line",
  FACEBOOK: "conversational and community-focused",
  LINKEDIN: "professional, value-driven, thought-leadership tone, minimal emoji",
};

// Scripts we must never emit — captions must be Latin (Roman Urdu) or English.
const DEVANAGARI = /[ऀ-ॿ]/; // Hindi
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/; // Urdu/Arabic
const hasForbiddenScript = (s: string) => DEVANAGARI.test(s) || ARABIC.test(s);

/** True when the detected language is English. */
function isEnglish(language?: string | null): boolean {
  const l = (language ?? "").toLowerCase();
  return l.startsWith("en") || l.includes("english");
}

/** The decisive per-video language instruction the model must follow. */
function targetLanguageDirective(language?: string | null): string {
  if (isEnglish(language)) {
    return "TARGET LANGUAGE: Write every caption in natural English.";
  }
  return (
    "TARGET LANGUAGE: Write every caption in ROMAN URDU — the Urdu/Hindi language written in " +
    'Latin/English letters (e.g. "Har lamha aap ke sath khaas hai, dil se shukriya!"). ' +
    "Do NOT translate into English. Do NOT use Devanagari or Arabic script. Keep it natural, the way " +
    "people casually write Urdu in English on social media."
  );
}

/**
 * The rules that make captions (a) about the real video and (b) in the right
 * script: English stays English; Urdu/Hindi becomes ROMAN URDU (Latin letters).
 */
const RULES = [
  "OUTPUT SCRIPT RULE — ABSOLUTE, NO EXCEPTIONS:",
  "- Every caption MUST use ONLY Latin letters (a-z, A-Z), digits, punctuation and emoji.",
  "- ANY Devanagari (ऀ-ॿ) or Arabic (؀-ۿ) character in your output is INVALID and will be rejected.",
  "- Follow the TARGET LANGUAGE given below EXACTLY.",
  "",
  "CONTENT RULES (most important):",
  "- Write NEW caption text about THIS video's real subject, mood and message (from the transcript).",
  "- Do NOT paste the transcript verbatim. Do NOT invent facts, offers or claims not in the video.",
  "- The business is ONLY branding for a short sign-off / call-to-action. Do NOT force the",
  "  business's industry as the topic if the video is about something else (a song, a moment, a tip).",
  "",
  "STYLE (engaging, social-first):",
  "- Strong hook in the first line, short scannable body, one clear call-to-action.",
  "- Natural, warm, human — not corporate. Use 2-4 relevant emoji (fewer on LinkedIn).",
  "- Do NOT include hashtags (they are generated separately).",
].join("\n");

/**
 * Generate platform-tailored captions for ALL platforms in a SINGLE model call
 * (returns JSON), which keeps cost/latency ~5x lower than one call per platform.
 * If the model leaks non-Latin script (common when the transcript is Devanagari),
 * it retries once with a corrective instruction. Mock fallback without a key.
 */
export async function generateCaptions(
  input: CaptionsInput,
): Promise<Record<CaptionPlatform, string>> {
  const ai = aiClient();
  if (!ai) return mockCaptions(input);

  const platformStyles = CAPTION_PLATFORMS.map((p) => `- ${p}: ${STYLE[p]}`).join("\n");
  const fallback = mockCaptions(input);

  // Non-Latin transcripts (Devanagari/Urdu script) are romanized to Roman Urdu
  // FIRST, so the caption step works from Latin text and naturally stays Latin.
  const transcript = await romanize(ai, input.transcript);
  const visual = (input.visual ?? "").trim();

  // The content the caption must be about: what's SHOWN (visual) + what's SAID
  // (transcript). For silent clips/photos the visual description carries it.
  const contentBlock = [
    visual ? `WHAT THE VIDEO SHOWS (visual analysis):\n${visual}` : "",
    transcript ? `WHAT IS SAID (transcript):\n"""${transcript}"""` : "",
  ]
    .filter(Boolean)
    .join("\n\n") || "(no speech or visuals detected — write a short, on-brand caption)";

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a senior social media copywriter. You write captions faithful to the actual " +
        "video content, in the correct script.\n\n" +
        RULES +
        "\n\nReturn ONLY a JSON object whose keys are exactly " +
        CAPTION_PLATFORMS.join(", ") +
        " and whose values are the caption strings. No extra keys, no commentary.",
    },
    {
      role: "user",
      content:
        `${targetLanguageDirective(input.language)}\n\n` +
        `VIDEO CONTENT (what the caption must be about):\n${contentBlock}\n\n` +
        `Brand for sign-off/CTA only: ${input.businessName ?? "a local business"} (${input.industry ?? "general"})\n` +
        `Per-platform tone:\n${platformStyles}`,
    },
  ];

  let out = fallback;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.chat.completions.create({
        model: aiModels().chat,
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages,
      });
      const parsed = parseJson(res.choices[0]?.message?.content ?? "");
      out = {} as Record<CaptionPlatform, string>;
      for (const p of CAPTION_PLATFORMS) {
        const v = parsed?.[p];
        out[p] = typeof v === "string" && v.trim() ? v.trim() : fallback[p];
      }
      // If nothing leaked forbidden script, we're done.
      const leaked = CAPTION_PLATFORMS.filter((p) => hasForbiddenScript(out[p]));
      if (leaked.length === 0) return out;
      // Otherwise push a corrective turn and retry once.
      messages.push(
        { role: "assistant", content: JSON.stringify(out) },
        {
          role: "user",
          content:
            "Your previous captions contained Devanagari or Arabic/Urdu script, which is INVALID. " +
            "Rewrite ALL captions using ONLY Latin letters (Roman Urdu) — transliterate any Urdu/Hindi " +
            "into English letters. Return the same JSON shape.",
        },
      );
    } catch {
      return out;
    }
  }
  return out;
}

/**
 * Transliterate Devanagari/Urdu-script text into Roman Urdu (Latin letters).
 * No-op for text that is already Latin (so English videos cost nothing extra).
 * On any failure it returns the original text — the caption step's own retry is
 * the final safety net.
 */
export async function romanize(ai: OpenAI, text: string): Promise<string> {
  if (!text || !hasForbiddenScript(text)) return text;
  try {
    const res = await ai.chat.completions.create({
      model: aiModels().chat,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You transliterate Urdu/Hindi text into ROMAN URDU (Urdu written with the Latin/English " +
            "alphabet). Output ONLY the transliteration — no translation, no quotes, no commentary. " +
            "Use only Latin letters, digits and punctuation.",
        },
        { role: "user", content: text },
      ],
    });
    const out = res.choices[0]?.message?.content?.trim();
    return out && !hasForbiddenScript(out) ? out : text;
  } catch {
    return text;
  }
}

/**
 * Transliterate the TEXT lines of an SRT subtitle file into Roman Urdu, leaving
 * the sequence numbers and timestamp lines untouched. No-op when the subtitles
 * are already Latin (English speech), so English videos keep English subtitles.
 */
export async function romanizeSrt(ai: OpenAI, srt: string): Promise<string> {
  if (!srt || !hasForbiddenScript(srt)) return srt;
  try {
    const res = await ai.chat.completions.create({
      model: aiModels().chat,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are given an SRT subtitle file. Transliterate ONLY the subtitle TEXT lines into " +
            "ROMAN URDU (Urdu/Hindi written with Latin letters). Keep every sequence number and every " +
            "timestamp line (e.g. '00:00:01,000 --> 00:00:03,000') and all blank lines EXACTLY as they " +
            "are. Do NOT translate to English, do NOT add commentary. Output ONLY the resulting SRT, " +
            "with subtitle text in Latin letters, digits and punctuation only.",
        },
        { role: "user", content: srt },
      ],
    });
    const out = res.choices[0]?.message?.content?.trim();
    return out && !hasForbiddenScript(out) ? out : srt;
  } catch {
    return srt;
  }
}

function parseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function mockCaptions(input: CaptionsInput): Record<CaptionPlatform, string> {
  const name = input.businessName ?? "our team";
  return {
    INSTAGRAM: `✨ You have to see this transformation! ✨\n\nSwipe through and watch the magic happen at ${name}.\n\n📍 Book your appointment today — link in bio 👆`,
    TIKTOK: `Wait for the results 👀 This is why people love ${name}. Book now!`,
    YOUTUBE: `${name}: Amazing Transformation (You Won't Believe the Results)\n\nIn this short we show a real result from our team. Subscribe for more.`,
    FACEBOOK: `We love sharing moments like these with our community! 💙 Come visit ${name} and let us take care of you.`,
    LINKEDIN: `Consistency and craft matter. Here's a recent result from the team at ${name} — proof that attention to detail delivers real outcomes for our clients.`,
  };
}
