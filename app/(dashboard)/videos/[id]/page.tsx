import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { VideoReview } from "@/components/video/video-review";

export const dynamic = "force-dynamic";

/** Best-effort public URL for a published post, by platform + external id. */
function postUrl(platform: string, externalId: string): string {
  switch (platform) {
    case "YOUTUBE":
      return `https://youtube.com/watch?v=${externalId}`;
    case "TIKTOK":
      return `https://www.tiktok.com/video/${externalId}`;
    case "INSTAGRAM":
      return `https://www.instagram.com/reel/${externalId}`;
    case "FACEBOOK":
      return `https://www.facebook.com/${externalId}`;
    case "LINKEDIN":
      return `https://www.linkedin.com/feed/update/${externalId}`;
    default:
      return "#";
  }
}

export default async function VideoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getCurrentBusiness();
  if (!business) notFound();

  const video = await prisma.video.findFirst({
    where: { id, businessId: business.id },
    include: {
      captions: true,
      hashtags: true,
      thumbnails: { orderBy: { createdAt: "asc" } },
      scheduledPosts: {
        orderBy: { createdAt: "desc" },
        include: { analytics: true },
      },
    },
  });
  if (!video) notFound();

  const primaryThumb = video.thumbnails.find((t) => t.isPrimary) ?? video.thumbnails[0] ?? null;

  const accounts = await prisma.socialAccount.findMany({
    where: { businessId: business.id, connected: true },
    select: { platform: true },
  });
  const connectedPlatforms = [...new Set(accounts.map((a) => a.platform))];

  // Latest post per platform for this video (accurate publishing status).
  const latestPostByPlatform: Record<string, { status: string; url: string | null; views: number | null }> = {};
  for (const p of video.scheduledPosts) {
    if (!latestPostByPlatform[p.platform]) {
      latestPostByPlatform[p.platform] = {
        status: p.status,
        url: p.externalPostId ? postUrl(p.platform, p.externalPostId) : null,
        views: p.analytics?.views ?? null,
      };
    }
  }

  const uploadedLabel = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(video.createdAt);

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
          originalUrl={video.originalUrl ?? ""}
          processedUrl={video.processedUrl}
          duration={video.duration}
          fileSize={video.fileSize}
          width={video.width}
          height={video.height}
          hasTranscript={Boolean(video.transcript && video.transcript.trim().length > 0)}
          uploadedLabel={uploadedLabel}
          posterUrl={primaryThumb?.url ?? null}
          thumbnails={video.thumbnails.map((t) => ({ id: t.id, url: t.url, isPrimary: t.isPrimary }))}
          subtitlesEnabled={video.subtitlesEnabled}
          trimStart={video.trimStart}
          trimEnd={video.trimEnd}
          captions={video.captions.map((c) => ({ platform: c.platform, text: c.text }))}
          hashtags={video.hashtags.map((h) => ({ platform: h.platform, tags: h.tags }))}
          connectedPlatforms={connectedPlatforms}
          postStatus={latestPostByPlatform}
        />
      </div>
    </>
  );
}
