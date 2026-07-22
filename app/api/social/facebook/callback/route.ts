import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { metaExchangeCode, metaGetPages, metaPageFollowers } from "@/lib/social/meta";
import { appBaseUrl } from "@/lib/social/oauth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** OAuth redirect target: store the user's Facebook Page as a connected account. */
export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = req.cookies.get("fb_oauth_state")?.value;

  if (oauthError || !code) return NextResponse.redirect(`${base}/settings?error=facebook_denied`);
  if (!state || state !== cookieState) return NextResponse.redirect(`${base}/settings?error=oauth_state`);

  try {
    const userToken = await metaExchangeCode("facebook", code);
    const pages = await metaGetPages(userToken);
    if (pages.length === 0) return NextResponse.redirect(`${base}/settings?error=facebook_no_page`);

    // Connect the first managed Page (multi-page selection can be added later).
    const page = pages[0];
    const business = await getCurrentBusiness();
    if (!business) return NextResponse.redirect(`${base}/settings?error=no_business`);

    const followers = await metaPageFollowers(page);

    await prisma.$transaction([
      prisma.socialAccount.deleteMany({ where: { businessId: business.id, platform: "FACEBOOK" } }),
      prisma.socialAccount.create({
        data: {
          businessId: business.id,
          platform: "FACEBOOK",
          accountId: page.id,
          handle: page.name,
          followers,
          accessToken: page.access_token,
          refreshToken: null,
          expiresAt: null, // Page tokens from a long-lived user token don't expire
          connected: true,
        },
      }),
    ]);

    logger.info({ page: page.id }, "facebook: connected");
    const res = NextResponse.redirect(`${base}/settings?connected=facebook`);
    res.cookies.delete("fb_oauth_state");
    return res;
  } catch (err) {
    logger.error({ err: String(err) }, "facebook: callback failed");
    return NextResponse.redirect(`${base}/settings?error=facebook_failed`);
  }
}
