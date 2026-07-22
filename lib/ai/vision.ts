import { aiClient, aiModels, aiProvider } from "./client";
import { logger } from "@/lib/logger";
import type OpenAI from "openai";

export interface VisionInput {
  /** JPEG/PNG frame buffers (video keyframes) or a single image. */
  frames: Buffer[];
  industry?: string | null;
  businessName?: string | null;
}

export interface VisualAnalysis {
  /** 2-4 sentence description of what the video shows (drives captions/hashtags). */
  description: string;
  /**
   * Which half of the frame burned captions should sit in so they DON'T cover the
   * main subject/face or on-screen text — decided per video by looking at the
   * actual frames. "bottom" is the safe default (most talking-head clips).
   */
  captionPlacement: "top" | "bottom";
}

const DEFAULT_ANALYSIS: VisualAnalysis = { description: "", captionPlacement: "bottom" };

/**
 * Analyse what a video (via sampled keyframes) VISUALLY shows, using a multimodal
 * model. This is what makes captions/hashtags match the actual content even when
 * there is no speech — the core "analyse the video" requirement — AND decides
 * where captions can safely go without covering the subject.
 *
 * Returns {@link DEFAULT_ANALYSIS} when there's no key (mock mode) or no frames.
 */
export async function analyzeVisual(input: VisionInput): Promise<VisualAnalysis> {
  const ai = aiClient();
  const frames = input.frames.slice(0, 5); // model accepts up to 5 images
  if (!ai || frames.length === 0) return DEFAULT_ANALYSIS;

  const imageParts: OpenAI.Chat.ChatCompletionContentPart[] = frames.map((buf) => ({
    type: "image_url",
    // Base64 data URLs so the model never has to reach our (localhost) storage.
    image_url: { url: `data:${sniffMime(buf)};base64,${buf.toString("base64")}` },
  }));

  const prompt =
    `These are ${frames.length > 1 ? `${frames.length} frames sampled from a short video` : "an image"}. ` +
    "Return ONLY a JSON object with exactly these keys:\n" +
    '- "description": 2-4 sentences describing CONCRETELY and objectively what is visually shown ' +
    "(main subject, setting, actions or before/after, notable details, mood). The video could be " +
    "about ANYTHING — a person, food, a product, a place, an activity, nature, text on screen. Only " +
    "describe what is actually visible. Do NOT assume any business or industry and do NOT invent " +
    "claims, prices or offers. This is used to write an accurate caption.\n" +
    '- "captionPlacement": either "top" or "bottom" — the half of the frame where LARGE on-screen ' +
    "captions would NOT cover the main subject (face/product) or any important on-screen text, judged " +
    'across all frames. If the subject fills the centre or the lower area is clear, choose "bottom".';

  const params: Record<string, unknown> = {
    model: aiModels().vision,
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...imageParts] }],
  };

  // `reasoning_effort: "none"` is a GROQ-ONLY extension that disables the <think>
  // trace on Groq's reasoning-based vision model. OpenAI's gpt-4o REJECTS this
  // parameter (400 Unsupported), which silently killed all visual analysis and
  // made captions fall back to the generic business-industry text. Only send it
  // to Groq; OpenAI vision models don't need it.
  if (aiProvider() === "groq") params.reasoning_effort = "none";

  try {
    const res = await ai.chat.completions.create(
      params as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    );
    const raw = stripReasoning(res.choices[0]?.message?.content ?? "");
    const parsed = parseJson(raw);
    // Fall back gracefully: if JSON didn't parse, treat any plain text as the
    // description so captions still get a content signal.
    const description =
      typeof parsed?.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : raw && !raw.trimStart().startsWith("{")
          ? raw
          : "";
    const captionPlacement = parsed?.captionPlacement === "top" ? "top" : "bottom";
    return { description, captionPlacement };
  } catch (err) {
    // Vision is best-effort: fall back to transcript-only — but LOG it, don't
    // swallow silently (a silent empty here is what broke caption accuracy).
    logger.warn({ err: String(err) }, "visual analysis call failed");
    return DEFAULT_ANALYSIS;
  }
}

/** Lenient JSON extractor (handles code-fenced or slightly-wrapped model output). */
function parseJson(raw: string): { description?: unknown; captionPlacement?: unknown } | null {
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
