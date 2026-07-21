export type Platform = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "YOUTUBE" | "LINKEDIN";

/** The connected account a post publishes through (tokens included for refresh). */
export interface PublishAccount {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export interface PublishInput {
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption: string;
  hashtags: string[];
  account: PublishAccount;
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
  fetchMetrics(externalPostId: string, account: PublishAccount): Promise<PlatformMetrics>;
}
