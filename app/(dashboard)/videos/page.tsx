import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { VideoStatusBadge } from "@/components/shared/status-badge";
import { PublishDialog } from "@/components/video/publish-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatBytes, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const business = await getCurrentBusiness();
  const videos = business
    ? await prisma.video.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
        include: {
          thumbnails: { where: { isPrimary: true }, take: 1 },
          _count: { select: { scheduledPosts: true, captions: true } },
        },
      })
    : [];
  const accounts = business
    ? await prisma.socialAccount.findMany({
        where: { businessId: business.id, connected: true },
        select: { platform: true },
      })
    : [];

  const connectedPlatforms = [...new Set(accounts.map((a) => a.platform))];

  return (
    <>
      <Topbar title="Videos" subtitle={`${videos.length} videos in your library`} />
      <div className="p-6">
        {videos.length === 0 ? (
          <Card className="p-12 text-center">
            <Clapperboard className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-3 font-medium">No videos yet</p>
            <p className="text-sm text-muted">Upload your first raw video to get started.</p>
            <Link href="/upload" className={cn(buttonVariants(), "mt-4")}>Upload video</Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => (
              <Card key={v.id} className="overflow-hidden">
                <div
                  className="aspect-[9/16] bg-cover bg-center bg-muted-surface"
                  style={{ backgroundImage: v.thumbnails[0] ? `url(${v.thumbnails[0].url})` : undefined }}
                />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{v.title}</p>
                    <VideoStatusBadge status={v.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span>{v.duration ? formatDuration(v.duration) : "—"}</span>
                    <span>{v.fileSize ? formatBytes(v.fileSize) : "—"}</span>
                    <span>{v._count.scheduledPosts} posts</span>
                  </div>
                  <div className="mt-3">
                    <PublishDialog
                      videoId={v.id}
                      connectedPlatforms={connectedPlatforms}
                      disabled={v.status !== "READY" && v.status !== "PUBLISHED"}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
