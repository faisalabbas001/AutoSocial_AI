import { Queue, QueueOptions } from "bullmq";
import { redis } from "@/lib/redis";

export const QUEUE_NAMES = {
  VIDEO: "video-processing",
  PUBLISH: "publishing",
} as const;

export interface VideoJobData {
  videoId: string;
}

export interface PublishJobData {
  scheduledPostId: string;
}

const connection: QueueOptions["connection"] = redis;

const defaultJobOptions: QueueOptions["defaultJobOptions"] = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

export const videoQueue = new Queue<VideoJobData>(QUEUE_NAMES.VIDEO, {
  connection,
  defaultJobOptions,
});

export const publishQueue = new Queue<PublishJobData>(QUEUE_NAMES.PUBLISH, {
  connection,
  defaultJobOptions,
});

/** Enqueue a raw video for the full AI processing pipeline. */
export async function enqueueVideoProcessing(videoId: string) {
  return videoQueue.add("process", { videoId }, { jobId: `video_${videoId}` });
}

/** Enqueue a scheduled post for publishing (optionally delayed until scheduledAt). */
export async function enqueuePublish(scheduledPostId: string, scheduledAt?: Date) {
  const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;
  return publishQueue.add(
    "publish",
    { scheduledPostId },
    { jobId: `publish_${scheduledPostId}`, delay },
  );
}
