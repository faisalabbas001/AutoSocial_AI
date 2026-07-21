import { aiClient, aiModels } from "./client";
import type { CaptionPlatform } from "./caption";

export interface HashtagInput {
  transcript: string;
  industry?: string | null;
  platform: CaptionPlatform;
}

const COUNT: Record<CaptionPlatform, number> = {
  INSTAGRAM: 25,
  TIKTOK: 6,
  YOUTUBE: 5,
  FACEBOOK: 4,
  LINKEDIN: 4,
};

/** Generate a platform-appropriate hashtag set with GPT-4o. Mock fallback without a key. */
export async function generateHashtags(input: HashtagInput): Promise<string[]> {
  const ai = aiClient();
  if (!ai) return mockHashtags(input);

  const res = await ai.chat.completions.create({
    model: aiModels().chat,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "Generate a mix of trending, niche, local and brand hashtags for the given " +
          "platform. Return ONLY a comma-separated list, each starting with #.",
      },
      {
        role: "user",
        content: `Industry: ${input.industry ?? "general"}\nPlatform: ${input.platform} (about ${COUNT[input.platform]} tags)\nTranscript:\n"""${input.transcript}"""`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "";
  const tags = raw
    .split(/[\s,]+/)
    .filter((t) => t.startsWith("#"))
    .slice(0, COUNT[input.platform]);
  return tags.length ? tags : mockHashtags(input);
}

function mockHashtags(input: HashtagInput): string[] {
  const base = ["#SmallBusiness", "#LocalBusiness", "#Transformation", "#BeforeAndAfter", "#Trending", "#Reels", "#ForYou", "#GlowUp"];
  return base.slice(0, COUNT[input.platform]);
}
