import { aiClient, aiModels } from "./client";
import { CAPTION_PLATFORMS, type CaptionPlatform } from "./caption";

export interface HashtagsInput {
  transcript: string;
  /** Vision-model description of what the video/image visually shows. */
  visual?: string | null;
  industry?: string | null;
}

const COUNT: Record<CaptionPlatform, number> = {
  INSTAGRAM: 25,
  TIKTOK: 6,
  YOUTUBE: 5,
  FACEBOOK: 4,
  LINKEDIN: 4,
};

/**
 * Generate platform-appropriate hashtag sets for ALL platforms in a SINGLE model
 * call (returns JSON), keeping cost/latency low. Hashtags are always in Latin
 * script (works for Roman Urdu and English alike). Mock fallback without a key.
 */
export async function generateAllHashtags(
  input: HashtagsInput,
): Promise<Record<CaptionPlatform, string[]>> {
  const ai = aiClient();
  if (!ai) return mockAllHashtags();

  const counts = CAPTION_PLATFORMS.map((p) => `- ${p}: about ${COUNT[p]} tags`).join("\n");

  const contentBlock =
    [
      input.visual ? `What the video shows: ${input.visual}` : "",
      input.transcript ? `What is said: """${input.transcript}"""` : "",
    ]
      .filter(Boolean)
      .join("\n") || "(no speech or visuals detected)";

  try {
    const res = await ai.chat.completions.create({
      model: aiModels().chat,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate hashtags that match the ACTUAL video content first, then add a few " +
            "niche, trending and brand tags. Base them on what the video is really about (the transcript), " +
            "not just the business industry. " +
            "Every hashtag starts with # and uses Latin letters only (no spaces, no Devanagari/Arabic script). " +
            "Return ONLY a JSON object whose keys are exactly " +
            CAPTION_PLATFORMS.join(", ") +
            " and whose values are arrays of hashtag strings.",
        },
        {
          role: "user",
          content:
            `VIDEO CONTENT (base hashtags on this):\n${contentBlock}\n\n` +
            `Brand/industry context: ${input.industry ?? "general"}\n` +
            `Counts per platform:\n${counts}`,
        },
      ],
    });

    const parsed = parseJson(res.choices[0]?.message?.content ?? "");
    const fallback = mockAllHashtags();
    const out = {} as Record<CaptionPlatform, string[]>;
    for (const p of CAPTION_PLATFORMS) {
      const raw = parsed?.[p];
      const tags = Array.isArray(raw)
        ? raw
            .map((t) => String(t).trim())
            .filter((t) => t.startsWith("#"))
            .slice(0, COUNT[p])
        : [];
      out[p] = tags.length ? tags : fallback[p];
    }
    return out;
  } catch {
    return mockAllHashtags();
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

function mockAllHashtags(): Record<CaptionPlatform, string[]> {
  const base = [
    "#SmallBusiness", "#LocalBusiness", "#Transformation", "#BeforeAndAfter",
    "#Trending", "#Reels", "#ForYou", "#GlowUp", "#Community", "#SupportLocal",
    "#Viral", "#Explore", "#Motivation", "#Results", "#BookNow", "#Quality",
    "#Service", "#Team", "#Happy", "#Review", "#Local", "#Business", "#Care",
    "#Trust", "#New",
  ];
  const out = {} as Record<CaptionPlatform, string[]>;
  for (const p of CAPTION_PLATFORMS) out[p] = base.slice(0, COUNT[p]);
  return out;
}
