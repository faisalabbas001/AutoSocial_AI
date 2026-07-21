import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: IORedis };

/**
 * Shared Redis connection. BullMQ requires `maxRetriesPerRequest: null`.
 */
export const redis =
  globalForRedis.redis ??
  new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    // Required by BullMQ. Eager connect so the queue is usable on first `add`.
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
