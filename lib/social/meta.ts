import { redirectUriFor } from "./oauth";

/**
 * Shared Meta (Facebook Graph API) OAuth used by BOTH Facebook and Instagram.
 *
 * Instagram publishing goes through Meta too — there is no separate "Instagram
 * login". The user logs in with Facebook, we find the Facebook Page they manage,
 * and (for Instagram) the IG Business/Creator account linked to that Page.
 *
 * One Meta app powers both: set FACEBOOK_APP_ID / FACEBOOK_APP_SECRET.
 *
 * Setup (one-time, by the app owner):
 *  1. Create an app at https://developers.facebook.com (type: Business)
 *  2. Add the products "Facebook Login" and (for IG) "Instagram Graph API"
 *  3. Add BOTH redirect URIs printed on the Settings page to Facebook Login → Settings
 *  4. Put the app id/secret in FACEBOOK_APP_ID / FACEBOOK_APP_SECRET
 *  5. For real users you must pass Meta App Review for the scopes below.
 */

const GRAPH_VERSION = "v21.0";
export const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
export const GRAPH_VIDEO = `https://graph-video.facebook.com/${GRAPH_VERSION}`;
const DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export const FB_CALLBACK = "/api/social/facebook/callback";
export const IG_CALLBACK = "/api/social/instagram/callback";

const FB_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "business_management"];
const IG_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

export type MetaKind = "facebook" | "instagram";

export function metaConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

function creds() {
  return { id: process.env.FACEBOOK_APP_ID!, secret: process.env.FACEBOOK_APP_SECRET! };
}

function callbackFor(kind: MetaKind): string {
  return kind === "instagram" ? IG_CALLBACK : FB_CALLBACK;
}

/** Build the Facebook consent-screen URL for either Facebook or Instagram scopes. */
export function metaAuthUrl(kind: MetaKind, state: string): string {
  const { id } = creds();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUriFor(callbackFor(kind)),
    state,
    response_type: "code",
    scope: (kind === "instagram" ? IG_SCOPES : FB_SCOPES).join(","),
  });
  return `${DIALOG}?${params.toString()}`;
}

interface MetaToken {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

/**
 * Exchange an auth code for a user access token, then upgrade it to a long-lived
 * (~60 day) token. Page tokens derived from a long-lived user token don't expire.
 */
export async function metaExchangeCode(kind: MetaKind, code: string): Promise<string> {
  const { id, secret } = creds();
  const short = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    client_id: id,
    client_secret: secret,
    redirect_uri: redirectUriFor(callbackFor(kind)),
    code,
  })}`;
  const res = await fetch(short);
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  const data: MetaToken = await res.json();

  const long = `${GRAPH}/oauth/access_token?${new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: id,
    client_secret: secret,
    fb_exchange_token: data.access_token,
  })}`;
  const llRes = await fetch(long);
  if (!llRes.ok) return data.access_token; // fall back to the short-lived token
  const ll: MetaToken = await llRes.json();
  return ll.access_token;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
}

/** Pages the user manages (each carries its own long-lived Page access token). */
export async function metaGetPages(userToken: string): Promise<MetaPage[]> {
  const res = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${userToken}`);
  if (!res.ok) throw new Error(`Meta pages fetch failed: ${await res.text()}`);
  const data = await res.json();
  return (data.data as MetaPage[]) ?? [];
}

/** A Page's follower/fan count (best-effort). */
export async function metaPageFollowers(page: MetaPage): Promise<number> {
  const res = await fetch(`${GRAPH}/${page.id}?fields=followers_count,fan_count&access_token=${page.access_token}`);
  if (!res.ok) return 0;
  const d = await res.json();
  return Number(d.followers_count || d.fan_count || 0);
}

export interface MetaIgAccount {
  id: string;
  username: string;
  followers: number;
  pageToken: string;
}

/** The Instagram Business/Creator account linked to a Page, if any. */
export async function metaGetIgAccount(page: MetaPage): Promise<MetaIgAccount | null> {
  const res = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
  if (!res.ok) return null;
  const data = await res.json();
  const igId = data.instagram_business_account?.id as string | undefined;
  if (!igId) return null;

  const infoRes = await fetch(`${GRAPH}/${igId}?fields=username,followers_count&access_token=${page.access_token}`);
  const info = infoRes.ok ? await infoRes.json() : {};
  return {
    id: igId,
    username: (info.username as string) || "instagram",
    followers: Number(info.followers_count || 0),
    pageToken: page.access_token,
  };
}
