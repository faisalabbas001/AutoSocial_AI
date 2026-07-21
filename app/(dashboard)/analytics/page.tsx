import { Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { formatCompact } from "@/lib/utils";
import type { Platform } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const business = await getCurrentBusiness();

  const where = { scheduledPost: { video: { businessId: business?.id ?? "" } } };
  const [totals, byPlatform, topPosts] = await Promise.all([
    prisma.analytics.aggregate({
      where,
      _sum: { views: true, likes: true, comments: true, shares: true },
    }),
    prisma.analytics.groupBy({
      by: ["scheduledPostId"],
      where,
      _sum: { views: true },
    }),
    prisma.scheduledPost.findMany({
      where: { video: { businessId: business?.id ?? "" }, status: "PUBLISHED" },
      include: { analytics: true, video: true },
      orderBy: { analytics: { views: "desc" } },
      take: 5,
    }),
  ]);

  // Aggregate views per platform for the chart.
  const platformViews = await prisma.scheduledPost.findMany({
    where: { video: { businessId: business?.id ?? "" } },
    select: { platform: true, analytics: { select: { views: true } } },
  });
  const chartMap = new Map<Platform, number>();
  for (const p of platformViews) {
    if (!p.analytics) continue;
    chartMap.set(p.platform, (chartMap.get(p.platform) ?? 0) + p.analytics.views);
  }
  const chartData = Array.from(chartMap.entries()).map(([platform, views]) => ({ platform, views }));

  const s = totals._sum;

  return (
    <>
      <Topbar title="Analytics" subtitle="Performance across all platforms" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Views" value={formatCompact(s.views ?? 0)} icon={Eye} />
          <StatCard label="Total Likes" value={formatCompact(s.likes ?? 0)} icon={Heart} accent="success" />
          <StatCard label="Comments" value={formatCompact(s.comments ?? 0)} icon={MessageCircle} accent="primary" />
          <StatCard label="Shares" value={formatCompact(s.shares ?? 0)} icon={Share2} accent="warning" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Views by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length ? (
                <EngagementChart data={chartData} />
              ) : (
                <p className="text-sm text-muted py-16 text-center">No published posts yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topPosts.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
              {topPosts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted w-4">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.video.title}</p>
                    <p className="text-xs text-muted">{p.platform.toLowerCase()}</p>
                  </div>
                  <span className="text-sm font-medium">{formatCompact(p.analytics?.views ?? 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
