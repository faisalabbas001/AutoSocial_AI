import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { VideoReview } from "@/components/video/video-review";

export const dynamic = "force-dynamic";

export default async function VideoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getCurrentBusiness();
  if (!business) notFound();

  const video = await prisma.video.findFirst({
    where: { id, businessId: business.id },
    include: {
      captions: true,
      hashtags: true,
      thumbnails: { where: { isPrimary: true }, take: 1 },
    },
  });
  if (!video) notFound();

  const accounts = await prisma.socialAccount.findMany({
    where: { businessId: business.id, connected: true },
    select: { platform: true },
  });
  const connectedPlatforms = [...new Set(accounts.map((a) => a.platform))];

  return (
    <>
      <Topbar title="Review & Publish" subtitle={video.title} />
      <div className="p-6">
        <Link href="/videos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to videos
        </Link>
        <VideoReview
          videoId={video.id}
          title={video.title}
          status={video.status}
          videoUrl={video.processedUrl ?? video.originalUrl ?? ""}
          isProcessed={Boolean(video.processedUrl)}
          posterUrl={video.thumbnails[0]?.url ?? null}
          captions={video.captions.map((c) => ({ platform: c.platform, text: c.text }))}
          hashtags={video.hashtags.map((h) => ({ platform: h.platform, tags: h.tags }))}
          connectedPlatforms={connectedPlatforms}
        />
      </div>
    </>
  );
}
