import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { tiktokConfigured, tiktokAuthUrl } from "@/lib/social/tiktok";
import { appBaseUrl, STATE_COOKIE } from "@/lib/social/oauth";

export const dynamic = "force-dynamic";

/** Kick off TikTok OAuth to connect a TikTok account. */
export async function GET() {
  const base = appBaseUrl();
  if (!tiktokConfigured()) {
    return NextResponse.redirect(`${base}/settings?error=tiktok_not_configured`);
  }
  const state = randomUUID();
  const res = NextResponse.redirect(tiktokAuthUrl(state));
  res.cookies.set("tt_oauth_state", state, STATE_COOKIE);
  return res;
}
