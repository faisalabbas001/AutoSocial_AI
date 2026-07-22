import Link from "next/link";
import { Camera, Globe, Video, AtSign, Music2, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { youtubeConfigured } from "@/lib/social/youtube";
import { metaConfigured } from "@/lib/social/meta";
import { tiktokConfigured } from "@/lib/social/tiktok";
import { redirectUriFor } from "@/lib/social/oauth";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCompact } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Platform } from "@prisma/client";

export const dynamic = "force-dynamic";

const PLATFORM_META: Record<Platform, { label: string; icon: typeof Camera }> = {
  INSTAGRAM: { label: "Instagram", icon: Camera },
  FACEBOOK: { label: "Facebook", icon: Globe },
  TIKTOK: { label: "TikTok", icon: Music2 },
  YOUTUBE: { label: "YouTube", icon: Video },
  LINKEDIN: { label: "LinkedIn", icon: AtSign },
};

/** Which platforms have a live OAuth flow, and where their "Connect" button points. */
const CONNECT: Record<Platform, { path: string; configured: boolean } | null> = {
  YOUTUBE: { path: "/api/social/youtube/connect", configured: youtubeConfigured() },
  FACEBOOK: { path: "/api/social/facebook/connect", configured: metaConfigured() },
  INSTAGRAM: { path: "/api/social/instagram/connect", configured: metaConfigured() },
  TIKTOK: { path: "/api/social/tiktok/connect", configured: tiktokConfigured() },
  LINKEDIN: null, // not wired yet
};

const CONNECTED_LABEL: Record<string, string> = {
  youtube: "YouTube channel",
  facebook: "Facebook Page",
  instagram: "Instagram account",
  tiktok: "TikTok account",
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth_state: "Security check failed. Please try connecting again.",
  no_business: "No business found. Run the seed script.",
  youtube_not_configured: "YouTube isn't configured — add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env.local.",
  youtube_denied: "YouTube connection was cancelled.",
  youtube_state: "Security check failed. Please try connecting again.",
  youtube_failed: "Couldn't connect YouTube — check your credentials and the authorized redirect URI.",
  facebook_not_configured: "Facebook isn't configured — add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env.local.",
  facebook_denied: "Facebook connection was cancelled.",
  facebook_no_page: "No Facebook Page found on that account. You need a Page to publish.",
  facebook_failed: "Couldn't connect Facebook — check your app credentials and redirect URI.",
  instagram_not_configured: "Instagram uses your Meta app — add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env.local.",
  instagram_denied: "Instagram connection was cancelled.",
  instagram_no_account:
    "No Instagram Business account found. Link an IG Business/Creator account to your Facebook Page first.",
  instagram_failed: "Couldn't connect Instagram — check your Meta app credentials and redirect URI.",
  tiktok_not_configured: "TikTok isn't configured — add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to .env.local.",
  tiktok_denied: "TikTok connection was cancelled.",
  tiktok_failed: "Couldn't connect TikTok — check your app keys and redirect URI.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const business = await getCurrentBusiness();
  const accounts = business
    ? await prisma.socialAccount.findMany({ where: { businessId: business.id } })
    : [];

  const connectedByPlatform = new Map(accounts.map((a) => [a.platform, a]));
  const allPlatforms = Object.keys(PLATFORM_META) as Platform[];

  return (
    <>
      <Topbar title="Settings" subtitle="Business profile & connected accounts" />
      <div className="p-6 space-y-6 max-w-3xl">
        {connected && CONNECTED_LABEL[connected] && (
          <Banner tone="success">
            <CheckCircle2 className="h-4.5 w-4.5" /> {CONNECTED_LABEL[connected]} connected successfully.
          </Banner>
        )}
        {error && (
          <Banner tone="danger">
            <AlertCircle className="h-4.5 w-4.5" /> {ERROR_MESSAGES[error] ?? "Something went wrong."}
          </Banner>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>How your brand appears on generated content.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Business Name" value={business?.name ?? "—"} />
            <Field label="Industry" value={business?.industry ?? "—"} />
            <Field label="Owner" value={business?.user.name ?? "—"} />
            <Field label="Plan" value={business?.user.subscription?.plan ?? "FREE"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Accounts</CardTitle>
            <CardDescription>Connect platforms to publish automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allPlatforms.map((platform) => {
              const meta = PLATFORM_META[platform];
              const account = connectedByPlatform.get(platform);
              const Icon = meta.icon;
              const conn = CONNECT[platform];
              return (
                <div key={platform} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-surface">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {meta.label}
                      {conn && (
                        <Badge variant="primary" className="ml-2 align-middle">
                          Live
                        </Badge>
                      )}
                    </p>
                    {account ? (
                      <p className="text-xs text-muted">
                        {account.handle} · {formatCompact(account.followers)} followers
                        {account.expiresAt ? ` · token expires in ${formatDistanceToNow(account.expiresAt)}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-muted">Not connected</p>
                    )}
                  </div>

                  {account ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" /> Connected
                      </Badge>
                      <form action="/api/social/disconnect" method="post">
                        <input type="hidden" name="accountId" value={account.id} />
                        <button
                          type="submit"
                          className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "text-danger")}
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  ) : conn && conn.configured ? (
                    <Link href={conn.path} className={cn(buttonVariants({ size: "sm" }))}>
                      <Link2 className="h-4 w-4" /> Connect
                    </Link>
                  ) : (
                    <span className={cn(buttonVariants({ size: "sm", variant: "outline" }), "opacity-50 pointer-events-none")}>
                      {conn ? "Add credentials" : "Soon"}
                    </span>
                  )}
                </div>
              );
            })}

            <div className="rounded-lg bg-muted-surface p-3 text-xs text-muted space-y-2">
              <p className="font-medium text-foreground">Connecting accounts</p>
              <p>
                Each “Connect” opens the platform’s own login — users approve access and come straight back. No
                passwords are ever entered here. Add each app’s credentials to <code className="rounded bg-surface px-1 py-0.5">.env.local</code>,
                then register these exact <span className="font-medium">Authorized redirect URIs</span>:
              </p>
              <ul className="space-y-1">
                <li>
                  YouTube (Google Cloud, “YouTube Data API v3”):{" "}
                  <code className="rounded bg-surface px-1 py-0.5">{redirectUriFor("/api/social/youtube/callback")}</code>
                </li>
                <li>
                  Facebook &amp; Instagram (one Meta app, “Facebook Login”):{" "}
                  <code className="rounded bg-surface px-1 py-0.5">{redirectUriFor("/api/social/facebook/callback")}</code>{" "}
                  and{" "}
                  <code className="rounded bg-surface px-1 py-0.5">{redirectUriFor("/api/social/instagram/callback")}</code>
                </li>
                <li>
                  TikTok (developer portal, “Content Posting API”):{" "}
                  <code className="rounded bg-surface px-1 py-0.5">{redirectUriFor("/api/social/tiktok/callback")}</code>
                </li>
              </ul>
              <p>
                Instagram needs an IG <span className="font-medium">Business/Creator</span> account linked to your
                Facebook Page. Platforms without credentials publish via a stub so the pipeline stays testable.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function Banner({ tone, children }: { tone: "success" | "danger"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 text-sm",
        tone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      {children}
    </div>
  );
}
