import type { Platform } from "@prisma/client";

/**
 * Target upload aspect ratio per platform. Most short-form feeds are 9:16
 * (Instagram Reels, TikTok, YouTube Shorts, Facebook Reels); LinkedIn favours a
 * square 1:1. Adjust here to change how each platform's video is framed.
 */
export const PLATFORM_ASPECT: Record<Platform, { w: number; h: number; label: string }> = {
  INSTAGRAM: { w: 1080, h: 1920, label: "9:16" },
  TIKTOK: { w: 1080, h: 1920, label: "9:16" },
  YOUTUBE: { w: 1080, h: 1920, label: "9:16" },
  FACEBOOK: { w: 1080, h: 1920, label: "9:16" },
  LINKEDIN: { w: 1080, h: 1080, label: "1:1" },
};
