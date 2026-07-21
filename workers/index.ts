import "./load-env";
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { QUEUE_NAMES, type VideoJobData, type PublishJobData } from "@/lib/queue";
import { processVideo } from "@/lib/pipeline/process-video";
import { publishPost } from "@/lib/pipeline/publish-post";

/**
 * Standalone worker process. Run with `npm run workers`.
 * Consumes the video-processing and publishing queues.
 */

const videoWorker = new Worker<VideoJobData>(
  QUEUE_NAMES.VIDEO,
  async (job) => processVideo(job.data.videoId),
  { connection: redis, concurrency: 2 },
);

const publishWorker = new Worker<PublishJobData>(
  QUEUE_NAMES.PUBLISH,
  async (job) => publishPost(job.data.scheduledPostId),
  { connection: redis, concurrency: 4 },
);

for (const [name, worker] of [
  ["video", videoWorker],
  ["publish", publishWorker],
] as const) {
  worker.on("completed", (job) => logger.info({ queue: name, jobId: job.id }, "job completed"));
  worker.on("failed", (job, err) =>
    logger.error({ queue: name, jobId: job?.id, err: err.message }, "job failed"),
  );
}

logger.info("Workers started: video-processing, publishing");

async function shutdown() {
  logger.info("Shutting down workers...");
  await Promise.all([videoWorker.close(), publishWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
