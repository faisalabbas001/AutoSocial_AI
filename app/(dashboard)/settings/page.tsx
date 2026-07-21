import Link from "next/link";
import { Camera, Globe, Video, AtSign, Music2, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { youtubeConfigured, redirectUri } from "@/lib/social/youtube";
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

const ERROR_MESSAGES: Record<string, string> = {
  youtube_not_configured: "YouTube isn't configured — add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env.local.",
  youtube_denied: "YouTube connection was cancelled.",
  youtube_state: "Security check failed. Please try connecting again.",
  youtube_failed: "Couldn't connect YouTube — check your credentials and the authorized redirect URI.",
  no_business: "No business found. Run the seed script.",
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
  const ytReady = youtubeConfigured();

  return (
    <>
      <Topbar title="Settings" subtitle="Business profile & connected accounts" />
      <div className="p-6 space-y-6 max-w-3xl">
        {connected === "youtube" && (
          <Banner tone="success">
            <CheckCircle2 className="h-4.5 w-4.5" /> YouTube channel connected successfully.
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
              const isYouTube = platform === "YOUTUBE";
              return (
                <div key={platform} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-surface">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {meta.label}
                      {isYouTube && (
                        <Badge variant="primary" className="ml-2 align-middle">
                          Live integration
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
                  ) : isYouTube && ytReady ? (
                    <Link href="/api/social/youtube/connect" className={cn(buttonVariants({ size: "sm" }))}>
                      <Link2 className="h-4 w-4" /> Connect
                    </Link>
                  ) : (
                    <span className={cn(buttonVariants({ size: "sm", variant: "outline" }), "opacity-50 pointer-events-none")}>
                      {isYouTube ? "Add credentials" : "Soon"}
                    </span>
                  )}
                </div>
              );
            })}

            <div className="rounded-lg bg-muted-surface p-3 text-xs text-muted space-y-1">
              <p className="font-medium text-foreground">YouTube is a live integration.</p>
              <p>
                Create an OAuth client at console.cloud.google.com (enable “YouTube Data API v3”), then set
                <code className="mx-1 rounded bg-surface px-1 py-0.5">YOUTUBE_CLIENT_ID</code> /
                <code className="mx-1 rounded bg-surface px-1 py-0.5">YOUTUBE_CLIENT_SECRET</code>.
              </p>
              <p>
                Authorized redirect URI:{" "}
                <code className="rounded bg-surface px-1 py-0.5">{redirectUri()}</code>
              </p>
              <p>Other platforms currently publish via a stub until their APIs are wired.</p>
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
