import { aiClient, aiModels } from "./client";

export type CaptionPlatform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "LINKEDIN";

export interface CaptionInput {
  transcript: string;
  industry?: string | null;
  businessName?: string | null;
  platform: CaptionPlatform;
}

const STYLE: Record<CaptionPlatform, string> = {
  INSTAGRAM: "emotional, story-driven, with line breaks and 2-4 emoji",
  TIKTOK: "short, punchy, trend-aware, with a strong hook in the first line",
  YOUTUBE: "SEO-optimised description with keywords and a clear title line",
  FACEBOOK: "conversational and community-focused",
  LINKEDIN: "professional, value-driven, thought-leadership tone, minimal emoji",
};

/** Generate a platform-tailored caption with GPT-4o. Mock fallback without a key. */
export async function generateCaption(input: CaptionInput): Promise<string> {
  const ai = aiClient();
  if (!ai) return mockCaption(input);

  const res = await ai.chat.completions.create({
    model: aiModels().chat,
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content:
          "You are a social media copywriter for local businesses. Write a single caption " +
          "for the given platform. Include a relevant call-to-action. Do not include hashtags.",
      },
      {
        role: "user",
        content:
          `Business: ${input.businessName ?? "a local business"} (${input.industry ?? "general"})\n` +
          `Platform: ${input.platform} — style: ${STYLE[input.platform]}\n` +
          `Video transcript:\n"""${input.transcript}"""`,
      },
    ],
  });

  return res.choices[0]?.message?.content?.trim() ?? mockCaption(input);
}

function mockCaption(input: CaptionInput): string {
  const name = input.businessName ?? "our team";
  switch (input.platform) {
    case "INSTAGRAM":
      return `✨ You have to see this transformation! ✨\n\nSwipe through and watch the magic happen at ${name}.\n\n📍 Book your appointment today — link in bio 👆`;
    case "TIKTOK":
      return `Wait for the results 👀 This is why people love ${name}. Book now!`;
    case "YOUTUBE":
      return `${name}: Amazing Transformation (You Won't Believe the Results)\n\nIn this short we show a real result from our clinic. Subscribe for more.`;
    case "FACEBOOK":
      return `We love sharing moments like these with our community! 💙 Come visit ${name} and let us take care of you.`;
    case "LINKEDIN":
      return `Consistency and craft matter. Here's a recent result from the team at ${name} — proof that attention to detail delivers real outcomes for our clients.`;
  }
}
