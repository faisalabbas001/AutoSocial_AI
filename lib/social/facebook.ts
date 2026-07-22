import { logger } from "@/lib/logger";
import { GRAPH, GRAPH_VIDEO } from "./meta";
import { zeroMetrics } from "./oauth";
import type { PublishAccount, PublishInput, PublishResult, PlatformMetrics, SocialPublisher } from "./types";

export { metaConfigured as facebookConfigured } from "./meta";

/**
 * Real Facebook integration — publishes a video to the connected Facebook Page.
 * `account.accountId` is the Page id and `account.accessToken` is the Page token.
 * The video URL must be publicly reachable by Facebook's servers.
 */
export const facebookPublisher: SocialPublisher = {
  platform: "FACEBOOK",

  async publish({ videoUrl, caption, hashtags, account }: PublishInput): Promise<PublishResult> {
    if (!account.accessToken) throw new Error("Facebook account not connected");
    const description = [caption, hashtags.join(" ")].filter(Boolean).join("\n\n").slice(0, 4900);

    const res = await fetch(`${GRAPH_VIDEO}/${account.accountId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        file_url: videoUrl,
        description,
        access_token: account.accessToken,
      }),
    });
    if (!res.ok) throw new Error(`Facebook publish failed: ${await res.text()}`);
    const data = await res.json();
    const id = data.id as string;
    logger.info({ id }, "facebook: published");
    return { externalPostId: id, url: `https://www.facebook.com/${id}` };
  },

  async fetchMetrics(externalPostId: string, account: PublishAccount): Promise<PlatformMetrics> {
    const token = account.accessToken;
    if (!token) return zeroMetrics();
    try {
      const [insights, likes, comments] = await Promise.all([
        fetch(`${GRAPH}/${externalPostId}/video_insights?metric=total_video_views&access_token=${token}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`${GRAPH}/${externalPostId}/likes?summary=true&limit=0&access_token=${token}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`${GRAPH}/${externalPostId}/comments?summary=true&limit=0&access_token=${token}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      const views = Number(
        insights?.data?.find((m: { name: string }) => m.name === "total_video_views")?.values?.[0]?.value || 0,
      );
      return {
        views,
        likes: Number(likes?.summary?.total_count || 0),
        comments: Number(comments?.summary?.total_count || 0),
        shares: 0,
        reach: views,
      };
    } catch {
      return zeroMetrics();
    }
  },
};
