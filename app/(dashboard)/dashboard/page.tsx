import Link from "next/link";
import { Clapperboard, Send, Eye, TrendingUp, Upload } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VideoStatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatCompact, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const business = await getCurrentBusiness();
  if (!business) return <EmptyState />;

  const [videoCount, publishedCount, processingCount, recentVideos, analytics] = await Promise.all([
    prisma.video.count({ where: { businessId: business.id } }),
    prisma.scheduledPost.count({ where: { video: { businessId: business.id }, status: "PUBLISHED" } }),
    prisma.video.count({ where: { businessId: business.id, status: "PROCESSING" } }),
    prisma.video.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { thumbnails: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.analytics.aggregate({
      where: { scheduledPost: { video: { businessId: business.id } } },
      _sum: { views: true, likes: true },
    }),
  ]);

  const totalViews = analytics._sum.views ?? 0;
  const totalLikes = analytics._sum.likes ?? 0;

  return (
    <>
      <Topbar title={`Welcome back, ${business.user.name?.split(" ")[0] ?? "there"} 👋`} subtitle={business.name} />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Videos" value={videoCount} icon={Clapperboard} hint="Uploaded all-time" />
          <StatCard label="Published Posts" value={publishedCount} icon={Send} accent="success" hint="Across all platforms" />
          <StatCard label="Total Views" value={formatCompact(totalViews)} icon={Eye} accent="primary" hint={`${formatCompact(totalLikes)} likes`} />
          <StatCard label="Processing" value={processingCount} icon={TrendingUp} accent="warning" hint="Videos in the pipeline" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Videos</CardTitle>
              <Link href="/videos" className="text-sm text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentVideos.length === 0 && <p className="text-sm text-muted py-8 text-center">No videos yet.</p>}
              {recentVideos.map((v) => (
                <Link
                  key={v.id}
                  href={`/videos`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted-surface transition-colors"
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg bg-cover bg-center bg-muted-surface"
                    style={{ backgroundImage: v.thumbnails[0] ? `url(${v.thumbnails[0].url})` : undefined }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted">{v.duration ? formatDuration(v.duration) : "—"}</p>
                  </div>
                  <VideoStatusBadge status={v.status} />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/upload" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}>
                <Upload className="h-4 w-4" /> Upload a new video
              </Link>
              <Link href="/schedule" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}>
                <Send className="h-4 w-4" /> Schedule a post
              </Link>
              <Link href="/analytics" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}>
                <TrendingUp className="h-4 w-4" /> View analytics
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="text-center">
        <h2 className="text-lg font-semibold">No business found</h2>
        <p className="text-sm text-muted mt-1">Run <code className="rounded bg-muted-surface px-1.5 py-0.5">npm run prisma:seed</code> to load demo data.</p>
      </div>
    </div>
  );
}
