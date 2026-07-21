import type { Platform, PublishInput, PublishResult, PlatformMetrics, SocialPublisher } from "./types";

export * from "./types";

/**
 * Stub publisher used for every platform until real API credentials + app review
 * are in place. It simulates a successful publish so the end-to-end pipeline is
 * exercisable. Swap individual platforms for real implementations (Instagram
 * Graph API, TikTok Content Posting API, YouTube Data API v3, etc.) as they go live.
 */
function makeStub(platform: Platform): SocialPublisher {
  return {
    platform,
    async publish(input: PublishInput): Promise<PublishResult> {
      const id = `${platform.toLowerCase()}_${Math.random().toString(36).slice(2, 11)}`;
      return { externalPostId: id, url: `https://example.com/${platform.toLowerCase()}/${id}` };
    },
    async fetchMetrics(): Promise<PlatformMetrics> {
      const r = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));
      const views = r(200, 8000);
      return {
        views,
        likes: Math.floor(views * (0.05 + Math.random() * 0.1)),
        comments: r(0, 60),
        shares: r(0, 40),
        reach: Math.floor(views * (1 + Math.random())),
      };
    },
  };
}

const publishers: Record<Platform, SocialPublisher> = {
  INSTAGRAM: makeStub("INSTAGRAM"),
  FACEBOOK: makeStub("FACEBOOK"),
  TIKTOK: makeStub("TIKTOK"),
  YOUTUBE: makeStub("YOUTUBE"),
  LINKEDIN: makeStub("LINKEDIN"),
};

export function getPublisher(platform: Platform): SocialPublisher {
  return publishers[platform];
}
