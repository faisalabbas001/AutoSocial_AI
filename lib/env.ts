import { z } from "zod";

/**
 * Centralised, validated environment access.
 * Server-only values are read lazily so the client bundle never touches them.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GROQ_API_KEY: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_BUCKET_NAME: z.string().default("autosocial-videos"),
  S3_PUBLIC_URL: z.string().optional().default(""),
  S3_FORCE_PATH_STYLE: z.string().optional().default("true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cached: z.infer<typeof serverSchema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  cached = parsed.data;
  return cached;
}

/** True when an OpenAI key is configured; otherwise AI runs in mock mode. */
export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}
