import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { youtubeConfigured, getAuthUrl } from "@/lib/social/youtube";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Kick off the Google OAuth flow for connecting a YouTube channel. */
export async function GET() {
  if (!youtubeConfigured()) {
    return NextResponse.redirect(`${appUrl}/settings?error=youtube_not_configured`);
  }

  const state = randomUUID();
  const res = NextResponse.redirect(getAuthUrl(state));
  res.cookies.set("yt_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
