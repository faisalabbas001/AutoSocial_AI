import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { metaConfigured, metaAuthUrl } from "@/lib/social/meta";
import { appBaseUrl, STATE_COOKIE } from "@/lib/social/oauth";

export const dynamic = "force-dynamic";

/** Kick off Facebook Login to connect the linked Instagram Business account. */
export async function GET() {
  const base = appBaseUrl();
  if (!metaConfigured()) {
    return NextResponse.redirect(`${base}/settings?error=instagram_not_configured`);
  }
  const state = randomUUID();
  const res = NextResponse.redirect(metaAuthUrl("instagram", state));
  res.cookies.set("ig_oauth_state", state, STATE_COOKIE);
  return res;
}
