import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { PublishAccount, PublishInput, PublishResult, PlatformMetrics, SocialPublisher } from "./types";

/**
 * Real YouTube integration — Google OAuth 2.0 + YouTube Data API v3.
 * Implemented with plain fetch (no SDK dependency).
 *
 * Setup (one-time, by the app owner):
 *  1. Create a project at https://console.cloud.google.com
 *  2. Enable "YouTube Data API v3"
 *  3. Create an OAuth 2.0 Client ID (type: Web application)
 *  4. Add the redirect URI printed by redirectUri() to the client
 *  5. Put the client id/secret in YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET
 */

const OAUTH_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/youtube/v3";
const UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export function youtubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/social/youtube/callback`;
}

/** Build the Google consent-screen URL. */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // force a refresh_token every time
    state,
  });
  return `${OAUTH_AUTH}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

/** Exchange an auth code for access + refresh tokens. */
export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`YouTube token exchange failed: ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`YouTube token refresh failed: ${await res.text()}`);
  return res.json();
}

/** Return a valid access token, refreshing + persisting it if near expiry. */
async function ensureAccessToken(account: PublishAccount): Promise<string> {
  const fresh = account.expiresAt && account.expiresAt.getTime() > Date.now() + 60_000;
  if (account.accessToken && fresh) return account.accessToken;
  if (!account.refreshToken) {
    if (account.accessToken) return account.accessToken;
    throw new Error("YouTube account has no tokens — reconnect required");
  }
  const t = await refreshAccessToken(account.refreshToken);
  const expiresAt = new Date(Date.now() + t.expires_in * 1000);
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { accessToken: t.access_token, expiresAt },
  });
  return t.access_token;
}

/** Fetch the authenticated user's channel (id, title, subscriber count). */
export async function getChannel(accessToken: string) {
  const res = await fetch(`${API}/channels?part=snippet,statistics&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube channel fetch failed: ${await res.text()}`);
  const data = await res.json();
  const ch = data.items?.[0];
  return {
    id: ch?.id as string,
    title: ch?.snippet?.title as string | undefined,
    handle: (ch?.snippet?.customUrl as string) || (ch?.snippet?.title as string) || "youtube",
    subscribers: Number(ch?.statistics?.subscriberCount || 0),
  };
}

export const youtubePublisher: SocialPublisher = {
  platform: "YOUTUBE",

  async publish({ videoUrl, caption, hashtags, account }: PublishInput): Promise<PublishResult> {
    const token = await ensureAccessToken(account);

    // Fetch the processed video bytes from object storage.
    const vres = await fetch(videoUrl);
    if (!vres.ok) throw new Error(`could not fetch video for upload: ${vres.status}`);
    const bytes = Buffer.from(await vres.arrayBuffer());

    const title = (caption?.split("\n")[0] || "New video").slice(0, 95);
    const description = [caption, hashtags.join(" ")].filter(Boolean).join("\n\n").slice(0, 4900);
    const tags = hashtags.map((h) => h.replace(/^#/, "")).slice(0, 15);
    const privacyStatus = process.env.YOUTUBE_PRIVACY_STATUS || "private";

    // Resumable upload: initiate, then PUT the bytes to the returned URL.
    const init = await fetch(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": String(bytes.length),
      },
      body: JSON.stringify({
        snippet: { title, description, tags },
        status: { privacyStatus, selfDeclaredMadeForKids: false },
      }),
    });
    if (!init.ok) throw new Error(`YouTube upload init failed: ${await init.text()}`);
    const uploadUrl = init.headers.get("location");
    if (!uploadUrl) throw new Error("YouTube upload init returned no upload URL");

    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/*", "Content-Length": String(bytes.length) },
      body: bytes,
    });
    if (!up.ok) throw new Error(`YouTube upload failed: ${await up.text()}`);
    const result = await up.json();

    logger.info({ videoId: result.id }, "youtube: published");
    return { externalPostId: result.id, url: `https://youtube.com/watch?v=${result.id}` };
  },

  async fetchMetrics(externalPostId: string, account: PublishAccount): Promise<PlatformMetrics> {
    const token = await ensureAccessToken(account);
    const res = await fetch(`${API}/videos?part=statistics&id=${externalPostId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`YouTube stats failed: ${await res.text()}`);
    const data = await res.json();
    const s = data.items?.[0]?.statistics ?? {};
    const views = Number(s.viewCount || 0);
    return {
      views,
      likes: Number(s.likeCount || 0),
      comments: Number(s.commentCount || 0),
      shares: 0,
      reach: views,
    };
  },
};
