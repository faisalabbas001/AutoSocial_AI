import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { metaConfigured, metaAuthUrl } from "@/lib/social/meta";
import { appBaseUrl, STATE_COOKIE } from "@/lib/social/oauth";

export const dynamic = "force-dynamic";

/** Kick off Facebook Login to connect a Facebook Page. */
export async function GET() {
  const base = appBaseUrl();
  if (!metaConfigured()) {
    return NextResponse.redirect(`${base}/settings?error=facebook_not_configured`);
  }
  const state = randomUUID();
  const res = NextResponse.redirect(metaAuthUrl("facebook", state));
  res.cookies.set("fb_oauth_state", state, STATE_COOKIE);
  return res;
}
