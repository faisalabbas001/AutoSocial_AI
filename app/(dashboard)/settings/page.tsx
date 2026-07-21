import { Camera, Globe, Video, AtSign, Music2, Link2, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCompact } from "@/lib/utils";
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

export default async function SettingsPage() {
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
              return (
                <div key={platform} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-surface">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{meta.label}</p>
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
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline">
                      <Link2 className="h-4 w-4" /> Connect
                    </Button>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted pt-1">
              OAuth connection flows require platform app credentials (see{" "}
              <code className="rounded bg-muted-surface px-1 py-0.5">.env.example</code>). The publish
              pipeline currently runs against a stub publisher.
            </p>
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
