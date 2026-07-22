import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { metaExchangeCode, metaGetPages, metaGetIgAccount } from "@/lib/social/meta";
import { appBaseUrl } from "@/lib/social/oauth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** OAuth redirect target: find the IG Business account linked to a Page and store it. */
export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = req.cookies.get("ig_oauth_state")?.value;

  if (oauthError || !code) return NextResponse.redirect(`${base}/settings?error=instagram_denied`);
  if (!state || state !== cookieState) return NextResponse.redirect(`${base}/settings?error=oauth_state`);

  try {
    const userToken = await metaExchangeCode("instagram", code);
    const pages = await metaGetPages(userToken);

    // Find the first Page that has an Instagram Business account linked.
    let ig = null;
    for (const page of pages) {
      ig = await metaGetIgAccount(page);
      if (ig) break;
    }
    if (!ig) return NextResponse.redirect(`${base}/settings?error=instagram_no_account`);

    const business = await getCurrentBusiness();
    if (!business) return NextResponse.redirect(`${base}/settings?error=no_business`);

    await prisma.$transaction([
      prisma.socialAccount.deleteMany({ where: { businessId: business.id, platform: "INSTAGRAM" } }),
      prisma.socialAccount.create({
        data: {
          businessId: business.id,
          platform: "INSTAGRAM",
          accountId: ig.id,
          handle: ig.username,
          followers: ig.followers,
          accessToken: ig.pageToken, // IG publishing uses the linked Page token
          refreshToken: null,
          expiresAt: null,
          connected: true,
        },
      }),
    ]);

    logger.info({ ig: ig.id }, "instagram: connected");
    const res = NextResponse.redirect(`${base}/settings?connected=instagram`);
    res.cookies.delete("ig_oauth_state");
    return res;
  } catch (err) {
    logger.error({ err: String(err) }, "instagram: callback failed");
    return NextResponse.redirect(`${base}/settings?error=instagram_failed`);
  }
}
