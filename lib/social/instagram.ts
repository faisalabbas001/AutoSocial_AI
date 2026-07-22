import { logger } from "@/lib/logger";
import { GRAPH } from "./meta";
import { zeroMetrics } from "./oauth";
import type { PublishAccount, PublishInput, PublishResult, PlatformMetrics, SocialPublisher } from "./types";

export { metaConfigured as instagramConfigured } from "./meta";

/**
 * Real Instagram integration — publishes a Reel via the Content Publishing API.
 * `account.accountId` is the IG Business account id; `account.accessToken` is the
 * linked Page token. The video URL MUST be a public HTTPS URL (Instagram fetches
 * it), so localhost/MinIO won't work in dev — use a public bucket or a tunnel.
 */

/** Poll the media container until Instagram finishes processing the upload. */
async function waitForContainer(creationId: string, token: string, tries = 20): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${token}`);
    if (r.ok) {
      const d = await r.json();
      if (d.status_code === "FINISHED") return;
      if (d.status_code === "ERROR") throw new Error("Instagram media processing failed");
    }
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error("Instagram media processing timed out");
}

export const instagramPublisher: SocialPublisher = {
  platform: "INSTAGRAM",

  async publish({ videoUrl, caption, hashtags, account }: PublishInput): Promise<PublishResult> {
    const token = account.accessToken;
    if (!token) throw new Error("Instagram account not connected");
    const igId = account.accountId;

    const tags = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    const fullCaption = [caption, tags].filter(Boolean).join("\n\n").slice(0, 2200);

    // 1) Create a Reels container from the public video URL.
    const create = await fetch(`${GRAPH}/${igId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        caption: fullCaption,
        access_token: token,
      }),
    });
    if (!create.ok) throw new Error(`Instagram container create failed: ${await create.text()}`);
    const { id: creationId } = await create.json();

    // 2) Wait for Instagram to finish processing the video.
    await waitForContainer(creationId, token);

    // 3) Publish the processed container.
    const pub = await fetch(`${GRAPH}/${igId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: creationId, access_token: token }),
    });
    if (!pub.ok) throw new Error(`Instagram publish failed: ${await pub.text()}`);
    const { id } = await pub.json();

    const perm = await fetch(`${GRAPH}/${id}?fields=permalink&access_token=${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    logger.info({ id }, "instagram: published");
    return { externalPostId: id, url: perm?.permalink };
  },

  async fetchMetrics(externalPostId: string, account: PublishAccount): Promise<PlatformMetrics> {
    const token = account.accessToken;
    if (!token) return zeroMetrics();
    try {
      const basic: { like_count?: number; comments_count?: number } = await fetch(
        `${GRAPH}/${externalPostId}?fields=like_count,comments_count&access_token=${token}`,
      )
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
      const insights = await fetch(`${GRAPH}/${externalPostId}/insights?metric=reach,plays&access_token=${token}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const metric = (name: string) =>
        Number(insights?.data?.find((m: { name: string }) => m.name === name)?.values?.[0]?.value || 0);
      return {
        views: metric("plays"),
        likes: Number(basic.like_count || 0),
        comments: Number(basic.comments_count || 0),
        shares: 0,
        reach: metric("reach"),
      };
    } catch {
      return zeroMetrics();
    }
  },
};
