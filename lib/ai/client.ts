import OpenAI from "openai";

/**
 * AI provider selection. All providers use the OpenAI SDK shape.
 *
 * - `groq`   → free, fast, no credit card. Great for dev/demo. Uses Llama 3.3 70B
 *              for text and Whisper-large-v3 for transcription.
 * - `openai` → production quality (GPT-4o + whisper-1).
 * - `mock`   → deterministic offline output when no key is set.
 *
 * Precedence: GROQ_API_KEY, then OPENAI_API_KEY, else mock.
 */
export type AiProvider = "groq" | "openai" | "mock";

export function aiProvider(): AiProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

let client: OpenAI | null = null;

/** Returns a configured OpenAI-compatible client, or null in mock mode. */
export function aiClient(): OpenAI | null {
  const provider = aiProvider();
  if (provider === "mock") return null;
  if (client) return client;

  client =
    provider === "groq"
      ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  return client;
}

/** Model IDs for the active provider. */
export function aiModels(): { chat: string; transcribe: string; vision: string } {
  if (aiProvider() === "groq") {
    return {
      chat: process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
      transcribe: process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo",
      // Multimodal model for analysing video frames / images. Qwen 3.6 VL is the
      // vision-capable model currently available on Groq's free tier.
      vision: process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b",
    };
  }
  return { chat: "gpt-4o", transcribe: "whisper-1", vision: "gpt-4o" };
}

export const isMockMode = () => aiProvider() === "mock";
