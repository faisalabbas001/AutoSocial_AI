export type Platform = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "YOUTUBE" | "LINKEDIN";

export interface PublishInput {
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption: string;
  hashtags: string[];
  accessToken: string | null;
}

export interface PublishResult {
  externalPostId: string;
  url?: string;
}

export interface PlatformMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
}

export interface SocialPublisher {
  platform: Platform;
  publish(input: PublishInput): Promise<PublishResult>;
  fetchMetrics(externalPostId: string, accessToken: string | null): Promise<PlatformMetrics>;
}
