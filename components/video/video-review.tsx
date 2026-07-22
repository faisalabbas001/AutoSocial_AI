"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send, CheckCircle2, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
};

interface CaptionRow {
  platform: string;
  text: string;
}
interface HashtagRow {
  platform: string;
  tags: string[];
}

export function VideoReview({
  videoId,
  status,
  videoUrl,
  isProcessed,
  posterUrl,
  captions,
  hashtags,
  connectedPlatforms,
}: {
  videoId: string;
  title: string;
  status: string;
  videoUrl: string;
  isProcessed: boolean;
  posterUrl: string | null;
  captions: CaptionRow[];
  hashtags: HashtagRow[];
  connectedPlatforms: string[];
}) {
  const router = useRouter();

  // Platforms to show tabs for: everything the pipeline generated.
  const platforms = useMemo(
    () => [...new Set(captions.map((c) => c.platform))],
    [captions],
  );
  const [active, setActive] = useState(platforms[0] ?? "INSTAGRAM");

  // Editable state, keyed by platform.
  const [captionMap, setCaptionMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(captions.map((c) => [c.platform, c.text])),
  );
  const [tagMap, setTagMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(hashtags.map((h) => [h.platform, h.tags.join(" ")])),
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = status === "READY" || status === "PUBLISHED";

  function payload() {
    return {
      captions: platforms.map((p) => ({ platform: p, text: captionMap[p] ?? "" })),
      hashtags: platforms.map((p) => ({
        platform: p,
        tags: (tagMap[p] ?? "")
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => (t.startsWith("#") ? t : `#${t}`)),
      })),
    };
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Couldn't save your edits. Please try again.");
      return false;
    }
    setSavedAt(Date.now());
    return true;
  }

  async function publish() {
    if (connectedPlatforms.length === 0) {
      setError("No connected accounts. Connect platforms in Settings first.");
      return;
    }
    setPublishing(true);
    setError(null);
    // Persist edits first so the published posts use the reviewed text.
    const ok = await save();
    if (!ok) {
      setPublishing(false);
      return;
    }
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, platforms: connectedPlatforms }),
    });
    setPublishing(false);
    if (!res.ok) {
      setError("Publish failed. Is the worker running (npm run workers)?");
      return;
    }
    setPublished(true);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* ── Player ────────────────────────────────────────── */}
      <div className="space-y-3">
        <Card className="overflow-hidden">
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              poster={posterUrl ?? undefined}
              controls
              playsInline
              className="aspect-[9/16] w-full bg-black object-contain"
            />
          ) : (
            <div className="aspect-[9/16] w-full bg-muted-surface" />
          )}
        </Card>
        <div className="flex items-center justify-between text-sm">
          <VideoStatusBadge status={status} />
          <span className="text-muted">{isProcessed ? "Edited version" : "Original (not yet processed)"}</span>
        </div>
        {!ready && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-muted">
            This video is still processing. Captions, hashtags and the edited video appear here once it&apos;s ready.
            Make sure the worker is running: <code className="rounded bg-muted-surface px-1">npm run workers</code>.
          </p>
        )}
      </div>

      {/* ── Review / edit ─────────────────────────────────── */}
      <div className="space-y-4">
        {/* Platform tabs */}
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setActive(p)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                active === p ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted-surface",
                connectedPlatforms.includes(p) ? "" : "opacity-60",
              )}
            >
              {PLATFORM_LABEL[p] ?? p}
              {!connectedPlatforms.includes(p) && <span className="ml-1 text-xs">(not connected)</span>}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Caption</label>
              <textarea
                value={captionMap[active] ?? ""}
                onChange={(e) => setCaptionMap((m) => ({ ...m, [active]: e.target.value }))}
                rows={8}
                className="w-full resize-y rounded-lg border bg-surface p-3 text-sm leading-relaxed"
                placeholder="Caption for this platform…"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                <Hash className="h-3.5 w-3.5" /> Hashtags
              </label>
              <textarea
                value={tagMap[active] ?? ""}
                onChange={(e) => setTagMap((m) => ({ ...m, [active]: e.target.value }))}
                rows={3}
                className="w-full resize-y rounded-lg border bg-surface p-3 text-sm"
                placeholder="#example #tags separated by spaces"
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        {published ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span>Publishing to {connectedPlatforms.length} platform{connectedPlatforms.length === 1 ? "" : "s"}. Track progress on the Schedule page.</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={publish} disabled={!ready || publishing || saving}>
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish to all connected ({connectedPlatforms.length})
            </Button>
            <Button variant="outline" onClick={save} disabled={saving || publishing}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save edits
            </Button>
            {savedAt && !saving && <span className="text-sm text-muted">Saved ✓</span>}
          </div>
        )}
      </div>
    </div>
  );
}
