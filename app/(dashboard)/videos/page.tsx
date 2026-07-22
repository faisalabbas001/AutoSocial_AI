import Link from "next/link";
import { Clapperboard, Play, MessageSquareText, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { VideoStatusBadge } from "@/components/shared/status-badge";
import { PublishDialog } from "@/components/video/publish-dialog";
import { DeleteVideoButton } from "@/components/video/delete-video-button";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatBytes, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const business = await getCurrentBusiness();

  const total = business
    ? await prisma.video.count({ where: { businessId: business.id } })
    : 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number((await searchParams).page ?? "1");
  const page = Math.min(Math.max(1, Number.isFinite(requested) ? requested : 1), pageCount);

  const videos = business
    ? await prisma.video.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
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

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + videos.length;

  return (
    <>
      <Topbar title="Videos" subtitle={`${total} video${total === 1 ? "" : "s"} in your library`} />
      <div className="p-6">
        {total === 0 ? (
          <Card className="p-12 text-center">
            <Clapperboard className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-3 font-medium">No videos yet</p>
            <p className="text-sm text-muted">Upload your first raw video to get started.</p>
            <Link href="/upload" className={cn(buttonVariants(), "mt-4")}>Upload video</Link>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((v) => {
                const reviewable = v.status === "READY" || v.status === "PUBLISHED";
                const thumb = v.thumbnails[0]?.url;
                return (
                  <Card key={v.id} className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                    {/* Thumbnail */}
                    <Link href={`/videos/${v.id}`} className="relative block aspect-[9/16] overflow-hidden bg-muted-surface">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={v.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-soft to-muted-surface">
                          <Clapperboard className="h-10 w-10 text-muted" />
                        </div>
                      )}
                      {/* status + duration overlays */}
                      <div className="absolute left-2 top-2">
                        <VideoStatusBadge status={v.status} />
                      </div>
                      {v.duration ? (
                        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                          {formatDuration(v.duration)}
                        </span>
                      ) : null}
                      {reviewable && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primary shadow">
                            <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Body */}
                    <div className="flex flex-1 flex-col p-3">
                      <Link
                        href={`/videos/${v.id}`}
                        className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
                        title={v.title}
                      >
                        {v.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>{v.fileSize ? formatBytes(v.fileSize) : "—"}</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquareText className="h-3 w-3" />
                          {v._count.captions}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {v._count.scheduledPosts}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2 pt-1">
                        <Link
                          href={`/videos/${v.id}`}
                          className={cn(
                            buttonVariants({ size: "sm" }),
                            "flex-1",
                            !reviewable && "pointer-events-none opacity-50",
                          )}
                          aria-disabled={!reviewable}
                        >
                          Review & Publish
                        </Link>
                        <PublishDialog videoId={v.id} connectedPlatforms={connectedPlatforms} disabled={!reviewable} />
                        <DeleteVideoButton videoId={v.id} title={v.title} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted">
                Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
                <span className="font-medium text-foreground">{total}</span>
              </p>
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <PageLink page={page - 1} disabled={page <= 1} label="Previous">
                    <ChevronLeft className="h-4 w-4" />
                  </PageLink>
                  {pageNumbers(page, pageCount).map((n, i) =>
                    n === "…" ? (
                      <span key={`gap-${i}`} className="px-2 text-sm text-muted">…</span>
                    ) : (
                      <Link
                        key={n}
                        href={`/videos?page=${n}`}
                        className={cn(
                          "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors",
                          n === page ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted-surface",
                        )}
                      >
                        {n}
                      </Link>
                    ),
                  )}
                  <PageLink page={page + 1} disabled={page >= pageCount} label="Next">
                    <ChevronRight className="h-4 w-4" />
                  </PageLink>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PageLink({
  page,
  disabled,
  label,
  children,
}: {
  page: number;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const cls = "inline-flex h-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors";
  if (disabled) {
    return (
      <span aria-disabled className={cn(cls, "pointer-events-none opacity-40")} aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={`/videos?page=${page}`} className={cn(cls, "hover:bg-muted-surface")} aria-label={label}>
      {children}
    </Link>
  );
}

/** Compact page list with ellipses: 1 … 4 5 6 … 20 */
function pageNumbers(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < count - 1) pages.push("…");
  pages.push(count);
  return pages;
}
