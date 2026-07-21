import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { exchangeCode, getChannel } from "@/lib/social/youtube";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** OAuth redirect target: exchange the code and store the connected channel. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = req.cookies.get("yt_oauth_state")?.value;

  if (oauthError || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=youtube_denied`);
  }
  if (!state || state !== cookieState) {
    return NextResponse.redirect(`${appUrl}/settings?error=youtube_state`);
  }

  try {
    const tokens = await exchangeCode(code);
    const channel = await getChannel(tokens.access_token);
    const business = await getCurrentBusiness();
    if (!business) return NextResponse.redirect(`${appUrl}/settings?error=no_business`);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // One connected YouTube account per business: replace any prior one.
    await prisma.$transaction([
      prisma.socialAccount.deleteMany({ where: { businessId: business.id, platform: "YOUTUBE" } }),
      prisma.socialAccount.create({
        data: {
          businessId: business.id,
          platform: "YOUTUBE",
          accountId: channel.id,
          handle: channel.handle,
          followers: channel.subscribers,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt,
          connected: true,
        },
      }),
    ]);

    logger.info({ channel: channel.id }, "youtube: connected");
    const res = NextResponse.redirect(`${appUrl}/settings?connected=youtube`);
    res.cookies.delete("yt_oauth_state");
    return res;
  } catch (err) {
    logger.error({ err: String(err) }, "youtube: callback failed");
    return NextResponse.redirect(`${appUrl}/settings?error=youtube_failed`);
  }
}
