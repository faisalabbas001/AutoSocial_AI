import type { Platform, PublishInput, PublishResult, PlatformMetrics, SocialPublisher } from "./types";
import { youtubePublisher, youtubeConfigured } from "./youtube";
import { facebookPublisher, facebookConfigured } from "./facebook";
import { instagramPublisher, instagramConfigured } from "./instagram";
import { tiktokPublisher, tiktokConfigured } from "./tiktok";

export * from "./types";

/**
 * Stub publisher used for platforms without a real integration yet. It simulates
 * a successful publish so the end-to-end pipeline stays exercisable. Real
 * implementations (e.g. YouTube) are swapped in below as they come online.
 */
function makeStub(platform: Platform): SocialPublisher {
  return {
    platform,
    async publish(_input: PublishInput): Promise<PublishResult> {
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

const stubs: Record<Platform, SocialPublisher> = {
  INSTAGRAM: makeStub("INSTAGRAM"),
  FACEBOOK: makeStub("FACEBOOK"),
  TIKTOK: makeStub("TIKTOK"),
  YOUTUBE: makeStub("YOUTUBE"),
  LINKEDIN: makeStub("LINKEDIN"),
};

export function getPublisher(platform: Platform): SocialPublisher {
  switch (platform) {
    case "YOUTUBE":
      return youtubeConfigured() ? youtubePublisher : stubs.YOUTUBE;
    case "FACEBOOK":
      return facebookConfigured() ? facebookPublisher : stubs.FACEBOOK;
    case "INSTAGRAM":
      return instagramConfigured() ? instagramPublisher : stubs.INSTAGRAM;
    case "TIKTOK":
      return tiktokConfigured() ? tiktokPublisher : stubs.TIKTOK;
    default:
      return stubs[platform];
  }
}
