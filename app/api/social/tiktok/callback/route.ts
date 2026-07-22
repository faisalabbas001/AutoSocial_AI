import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { tiktokExchangeCode, tiktokGetUser } from "@/lib/social/tiktok";
import { appBaseUrl } from "@/lib/social/oauth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** OAuth redirect target: exchange the code and store the connected TikTok account. */
export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = req.cookies.get("tt_oauth_state")?.value;

  if (oauthError || !code) return NextResponse.redirect(`${base}/settings?error=tiktok_denied`);
  if (!state || state !== cookieState) return NextResponse.redirect(`${base}/settings?error=oauth_state`);

  try {
    const tokens = await tiktokExchangeCode(code);
    const user = await tiktokGetUser(tokens.access_token);
    const business = await getCurrentBusiness();
    if (!business) return NextResponse.redirect(`${base}/settings?error=no_business`);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.$transaction([
      prisma.socialAccount.deleteMany({ where: { businessId: business.id, platform: "TIKTOK" } }),
      prisma.socialAccount.create({
        data: {
          businessId: business.id,
          platform: "TIKTOK",
          accountId: tokens.open_id || user.openId,
          handle: user.handle,
          followers: user.followers,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          connected: true,
        },
      }),
    ]);

    logger.info({ openId: tokens.open_id }, "tiktok: connected");
    const res = NextResponse.redirect(`${base}/settings?connected=tiktok`);
    res.cookies.delete("tt_oauth_state");
    return res;
  } catch (err) {
    logger.error({ err: String(err) }, "tiktok: callback failed");
    return NextResponse.redirect(`${base}/settings?error=tiktok_failed`);
  }
}
