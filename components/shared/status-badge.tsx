import { Badge } from "@/components/ui/badge";

const VIDEO_STATUS: Record<string, { label: string; variant: "neutral" | "primary" | "success" | "warning" | "danger" }> = {
  UPLOADING: { label: "Uploading", variant: "neutral" },
  QUEUED: { label: "Queued", variant: "warning" },
  PROCESSING: { label: "Processing", variant: "primary" },
  READY: { label: "Ready", variant: "success" },
  PUBLISHED: { label: "Published", variant: "success" },
  FAILED: { label: "Failed", variant: "danger" },
};

const POST_STATUS: Record<string, { label: string; variant: "neutral" | "primary" | "success" | "warning" | "danger" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  SCHEDULED: { label: "Scheduled", variant: "warning" },
  PUBLISHING: { label: "Publishing", variant: "primary" },
  PUBLISHED: { label: "Published", variant: "success" },
  FAILED: { label: "Failed", variant: "danger" },
};

export function VideoStatusBadge({ status }: { status: string }) {
  const s = VIDEO_STATUS[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function PostStatusBadge({ status }: { status: string }) {
  const s = POST_STATUS[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
