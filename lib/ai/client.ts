import OpenAI from "openai";

let client: OpenAI | null = null;

/** Returns an OpenAI client, or null when no API key is configured (mock mode). */
export function openai(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const isMockMode = () => !process.env.OPENAI_API_KEY;
