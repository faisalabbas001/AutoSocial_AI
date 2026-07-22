import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { redirectUriFor, zeroMetrics } from "./oauth";
import type { PublishAccount, PublishInput, PublishResult, PlatformMetrics, SocialPublisher } from "./types";

/**
 * Real TikTok integration — OAuth v2 + Content Posting API (Direct Post).
 *
 * Setup (one-time, by the app owner):
 *  1. Create an app at https://developers.tiktok.com
 *  2. Add the "Login Kit" and "Content Posting API" products
 *  3. Add the redirect URI printed on the Settings page
 *  4. Put the keys in TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET
 *  5. Until your app passes TikTok's audit it can only post privately
 *     (SELF_ONLY) to the developer's own account — see TIKTOK_PRIVACY_LEVEL.
 */

const AUTH = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";
export const TIKTOK_CALLBACK = "/api/social/tiktok/callback";

const SCOPES = ["user.info.basic", "video.publish"];

export function tiktokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export function tiktokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: SCOPES.join(","),
    response_type: "code",
    redirect_uri: redirectUriFor(TIKTOK_CALLBACK),
    state,
  });
  return `${AUTH}?${params.toString()}`;
}

interface TikTokToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope?: string;
}

export async function tiktokExchangeCode(code: string): Promise<TikTokToken> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUriFor(TIKTOK_CALLBACK),
    }),
  });
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function tiktokGetUser(accessToken: string) {
  const res = await fetch(`${API}/user/info/?fields=open_id,display_name,follower_count`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`TikTok user info failed: ${await res.text()}`);
  const d = await res.json();
  const u = d.data?.user ?? {};
  return {
    openId: (u.open_id as string) ?? "",
    handle: (u.display_name as string) || "tiktok",
    followers: Number(u.follower_count || 0),
  };
}

async function tiktokRefresh(refreshToken: string): Promise<TikTokToken> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`TikTok token refresh failed: ${await res.text()}`);
  return res.json();
}

/** Return a valid access token, refreshing + persisting it if near expiry. */
async function ensureAccessToken(account: PublishAccount): Promise<string> {
  const fresh = account.expiresAt && account.expiresAt.getTime() > Date.now() + 60_000;
  if (account.accessToken && fresh) return account.accessToken;
  if (!account.refreshToken) {
    if (account.accessToken) return account.accessToken;
    throw new Error("TikTok account has no tokens — reconnect required");
  }
  const t = await tiktokRefresh(account.refreshToken);
  const expiresAt = new Date(Date.now() + t.expires_in * 1000);
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt },
  });
  return t.access_token;
}

export const tiktokPublisher: SocialPublisher = {
  platform: "TIKTOK",

  async publish({ videoUrl, caption, hashtags, account }: PublishInput): Promise<PublishResult> {
    const token = await ensureAccessToken(account);
    const tags = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    const title = [caption?.split("\n")[0], tags].filter(Boolean).join(" ").slice(0, 2200);
    const privacyLevel = process.env.TIKTOK_PRIVACY_LEVEL || "SELF_ONLY";

    // Direct Post via PULL_FROM_URL — the video URL's domain must be verified in
    // the TikTok developer portal (URL Prefix / Domain verification).
    const res = await fetch(`${API}/post/publish/video/init/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        post_info: {
          title,
          privacy_level: privacyLevel,
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
        source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
      }),
    });
    if (!res.ok) throw new Error(`TikTok publish init failed: ${await res.text()}`);
    const d = await res.json();
    const publishId = d.data?.publish_id as string | undefined;
    if (!publishId) throw new Error(`TikTok publish returned no id: ${JSON.stringify(d)}`);
    logger.info({ publishId }, "tiktok: publish initiated");
    return { externalPostId: publishId };
  },

  async fetchMetrics(): Promise<PlatformMetrics> {
    // TikTok video analytics require additional scopes + a passed app audit;
    // return zeros until those are granted so the pipeline still records a post.
    return zeroMetrics();
  },
};
