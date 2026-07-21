import { config } from "dotenv";

// Loaded as the very first import in the worker entrypoint so that env vars are
// populated before any module (Redis, Prisma, storage) reads process.env.
config({ path: [".env.local", ".env"] });
