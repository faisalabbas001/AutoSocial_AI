import { aiClient, aiModels } from "./client";
import type OpenAI from "openai";

export interface VisionInput {
  /** JPEG/PNG frame buffers (video keyframes) or a single image. */
  frames: Buffer[];
  industry?: string | null;
  businessName?: string | null;
}

/**
 * Analyse what a video (via sampled keyframes) or image VISUALLY shows, using a
 * multimodal model. This is what makes captions/hashtags match the actual content
 * even when there is no speech — the core "analyse the video" requirement.
 *
 * Returns a concise English description of the subject, setting, actions and mood.
 * Empty string when there's no key (mock mode) or no frames.
 */
export async function analyzeVisual(input: VisionInput): Promise<string> {
  const ai = aiClient();
  const frames = input.frames.slice(0, 5); // model accepts up to 5 images
  if (!ai || frames.length === 0) return "";

  const imageParts: OpenAI.Chat.ChatCompletionContentPart[] = frames.map((buf) => ({
    type: "image_url",
    // Base64 data URLs so the model never has to reach our (localhost) storage.
    image_url: { url: `data:${sniffMime(buf)};base64,${buf.toString("base64")}` },
  }));

  const prompt =
    `These are ${frames.length > 1 ? `${frames.length} frames sampled from a short social media video` : "an image"} ` +
    `for ${input.businessName ?? "a local business"}${input.industry ? ` (${input.industry})` : ""}. ` +
    "Describe CONCRETELY what is visually shown: the main subject, setting, any actions or " +
    "before/after, notable visual details, and the overall mood. 2-4 sentences. " +
    "Only describe what is actually visible — do not invent claims, prices or offers. " +
    "This description will be used to write an accurate social media caption.";

  // The vision model is a reasoning model that would otherwise spend its whole
  // token budget "thinking" and return empty content. `reasoning_effort: "none"`
  // (a Groq extension) disables the <think> trace, giving a direct, cheap answer.
  // Cast through unknown because it's not part of the OpenAI type definitions.
  const params = {
    model: aiModels().vision,
    temperature: 0.4,
    max_tokens: 500,
    reasoning_effort: "none",
    messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...imageParts] }],
  };

  try {
    const res = await ai.chat.completions.create(
      params as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    );
    return stripReasoning(res.choices[0]?.message?.content ?? "");
  } catch {
    // Vision is best-effort: on any failure we fall back to transcript-only.
    return "";
  }
}

/** Remove a reasoning model's <think>…</think> block, leaving the final answer. */
function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim();
}

/** Detect image mime from magic bytes so the data URL matches the actual bytes. */
function sniffMime(buf: Buffer): string {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.length >= 12 && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 3 && buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return "image/jpeg";
}
