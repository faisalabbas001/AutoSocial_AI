import { CalendarClock, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentBusiness } from "@/lib/current";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PostStatusBadge } from "@/components/shared/status-badge";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const business = await getCurrentBusiness();

  const posts = business
    ? await prisma.scheduledPost.findMany({
        where: { video: { businessId: business.id } },
        include: { video: true, socialAccount: true },
        orderBy: [{ scheduledAt: "asc" }, { publishedAt: "desc" }],
      })
    : [];

  const upcoming = posts.filter((p) => p.status === "SCHEDULED" || p.status === "DRAFT");
  const published = posts.filter((p) => p.status === "PUBLISHED");

  return (
    <>
      <Topbar title="Schedule" subtitle="Manage your posting queue" />
      <div className="p-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <CalendarClock className="h-4.5 w-4.5 text-warning" />
            <CardTitle>Upcoming Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted py-6 text-center">Nothing scheduled yet.</p>}
            {upcoming.map((p) => (
              <PostRow key={p.id} title={p.video.title} platform={p.platform} status={p.status} when={p.scheduledAt} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-success" />
            <CardTitle>Recently Published</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {published.length === 0 && <p className="text-sm text-muted py-6 text-center">No published posts yet.</p>}
            {published.map((p) => (
              <PostRow key={p.id} title={p.video.title} platform={p.platform} status={p.status} when={p.publishedAt} />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PostRow({
  title,
  platform,
  status,
  when,
}: {
  title: string;
  platform: string;
  status: string;
  when: Date | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted capitalize">
          {platform.toLowerCase()}
          {when ? ` · ${format(when, "MMM d, h:mm a")}` : ""}
        </p>
      </div>
      <PostStatusBadge status={status} />
    </div>
  );
}
