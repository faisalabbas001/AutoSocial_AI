"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Save, Send, CheckCircle2, Hash, Copy, Check, AlertCircle,
  ImagePlus, Scissors, Captions, Upload, ExternalLink,
  Camera, Globe, Music2, Video, AtSign, type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoStatusBadge, PostStatusBadge } from "@/components/shared/status-badge";
import { cn, formatBytes, formatCompact } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
};

const PLATFORM_ICON: Record<string, LucideIcon> = {
  INSTAGRAM: Camera,
  FACEBOOK: Globe,
  TIKTOK: Music2,
  YOUTUBE: Video,
  LINKEDIN: AtSign,
};

const ALL_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN"] as const;

interface PostState {
  status: string;
  url: string | null;
  views: number | null;
}

// Caption character limits per platform — drives the live counter so users
// don't write something the platform will truncate on publish.
const CAPTION_LIMIT: Record<string, number> = {
  INSTAGRAM: 2200,
  FACEBOOK: 63206,
  TIKTOK: 2200,
  YOUTUBE: 5000,
  LINKEDIN: 3000,
};

interface CaptionRow {
  platform: string;
  text: string;
}
interface HashtagRow {
  platform: string;
  tags: string[];
}
interface Thumb {
  id: string;
  url: string;
  isPrimary: boolean;
}

/** Format seconds as m:ss for the trim controls. */
function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoReview({
  videoId,
  status,
  originalUrl,
  processedUrl,
  duration,
  fileSize,
  width,
  height,
  hasTranscript,
  uploadedLabel,
  posterUrl,
  thumbnails,
  subtitlesEnabled,
  trimStart,
  trimEnd,
  captions,
  hashtags,
  connectedPlatforms,
  postStatus,
}: {
  videoId: string;
  title: string;
  status: string;
  originalUrl: string;
  processedUrl: string | null;
  duration: number | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  hasTranscript: boolean;
  uploadedLabel: string;
  posterUrl: string | null;
  thumbnails: Thumb[];
  subtitlesEnabled: boolean;
  trimStart: number | null;
  trimEnd: number | null;
  captions: CaptionRow[];
  hashtags: HashtagRow[];
  connectedPlatforms: string[];
  postStatus: Record<string, PostState>;
}) {
  const router = useRouter();

  const platforms = useMemo(
    () => [...new Set([...captions.map((c) => c.platform), ...hashtags.map((h) => h.platform)])],
    [captions, hashtags],
  );
  const [active, setActive] = useState(platforms[0] ?? "INSTAGRAM");
  const [copied, setCopied] = useState(false);

  // Editable caption/hashtag state, keyed by platform.
  const [captionMap, setCaptionMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(captions.map((c) => [c.platform, c.text])),
  );
  const [tagMap, setTagMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(hashtags.map((h) => [h.platform, h.tags.join(" ")])),
  );

  // Video-level edit controls.
  const [subtitles, setSubtitles] = useState(subtitlesEnabled);
  const [tStart, setTStart] = useState<number | null>(trimStart);
  const [tEnd, setTEnd] = useState<number | null>(trimEnd);
  const [thumbUploading, setThumbUploading] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = status === "READY" || status === "PUBLISHED";

  // Show the subtitled preview when subtitles are on and a burned preview exists;
  // otherwise the original — so toggling subtitles gives immediate visual feedback.
  const showSubtitled = subtitles && Boolean(processedUrl);
  const videoUrl = showSubtitled ? processedUrl! : originalUrl;

  const processing = status === "UPLOADING" || status === "QUEUED" || status === "PROCESSING";
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [processing, router]);

  function markDirty() {
    setSavedAt(null);
  }

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
      subtitlesEnabled: subtitles,
      trimStart: tStart,
      trimEnd: tEnd,
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

  function editCaption(value: string) {
    setCaptionMap((m) => ({ ...m, [active]: value }));
    markDirty();
  }
  function editTags(value: string) {
    setTagMap((m) => ({ ...m, [active]: value }));
    markDirty();
  }

  async function selectThumb(id: string) {
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/thumbnail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnailId: id }),
    });
    if (res.ok) router.refresh();
    else setError("Couldn't set that thumbnail.");
  }

  async function uploadThumb(file: File) {
    setThumbUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/videos/${videoId}/thumbnail`, { method: "POST", body: form });
    setThumbUploading(false);
    if (res.ok) router.refresh();
    else setError("Couldn't upload that image.");
  }

  async function copyActive() {
    const caption = captionMap[active] ?? "";
    const tags = tagMap[active] ?? "";
    await navigator.clipboard.writeText([caption, tags].filter(Boolean).join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const captionText = captionMap[active] ?? "";
  const captionLimit = CAPTION_LIMIT[active] ?? 2200;
  const overLimit = captionText.length > captionLimit;
  const tagCount = (tagMap[active] ?? "").split(/[\s,]+/).filter(Boolean).length;
  const noContent = platforms.length === 0;
  const dur = duration ?? 0;
  const trimmedLen = Math.max(0, (tEnd ?? dur) - (tStart ?? 0));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* ── Player + video edit controls ─────────────────────── */}
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
          <span className="text-muted">{showSubtitled ? "Subtitled preview" : "Original"}</span>
        </div>

        {!ready ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-muted">
            This video is still processing. Captions, hashtags and the edited video appear here once it&apos;s ready.
            Make sure the worker is running: <code className="rounded bg-muted-surface px-1">npm run workers</code>.
          </p>
        ) : (
          <>
            {/* Thumbnail picker */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <ImagePlus className="h-4 w-4" /> Thumbnail
              </div>
              <div className="grid grid-cols-4 gap-2">
                {thumbnails.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectThumb(t.id)}
                    aria-label="Use this thumbnail"
                    className={cn(
                      "relative aspect-[9/16] overflow-hidden rounded-md border-2 transition-colors",
                      t.isPrimary ? "border-primary" : "border-transparent hover:border-border",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.url} alt="" className="h-full w-full object-cover" />
                    {t.isPrimary && (
                      <span className="absolute bottom-0.5 right-0.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  disabled={thumbUploading}
                  className="flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-muted transition-colors hover:bg-muted-surface"
                  aria-label="Upload custom thumbnail"
                >
                  {thumbUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span className="text-[10px]">Upload</span>
                </button>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadThumb(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Subtitles */}
            <label className="flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Captions className="h-4 w-4" /> Burn subtitles into video
              </span>
              <input
                type="checkbox"
                checked={subtitles}
                onChange={(e) => { setSubtitles(e.target.checked); markDirty(); }}
                className="h-4 w-4 accent-[var(--primary)]"
              />
            </label>

            {/* Trim */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Scissors className="h-4 w-4" /> Trim
                </span>
                <span className="text-xs text-muted">
                  {dur ? `${fmt(trimmedLen)} of ${fmt(dur)}` : "duration unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="flex flex-1 items-center gap-1.5">
                  <span className="text-xs text-muted">Start</span>
                  <input
                    type="number" min={0} max={dur || undefined} step={1}
                    value={tStart ?? ""}
                    placeholder="0"
                    onChange={(e) => { setTStart(e.target.value === "" ? null : Math.max(0, Number(e.target.value))); markDirty(); }}
                    className="w-full rounded-md border bg-surface px-2 py-1"
                  />
                </label>
                <label className="flex flex-1 items-center gap-1.5">
                  <span className="text-xs text-muted">End</span>
                  <input
                    type="number" min={0} max={dur || undefined} step={1}
                    value={tEnd ?? ""}
                    placeholder={dur ? String(dur) : "end"}
                    onChange={(e) => { setTEnd(e.target.value === "" ? null : Math.max(0, Number(e.target.value))); markDirty(); }}
                    className="w-full rounded-md border bg-surface px-2 py-1"
                  />
                </label>
                {(tStart != null || tEnd != null) && (
                  <button
                    type="button"
                    onClick={() => { setTStart(null); setTEnd(null); markDirty(); }}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">Applied to each platform&apos;s video at publish time.</p>
            </div>
          </>
        )}
      </div>

      {/* ── Caption / hashtag review ─────────────────────────── */}
      <div className="space-y-4">
        {noContent ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              {ready ? (
                <>
                  <AlertCircle className="h-6 w-6 text-warning" />
                  <p className="text-sm font-medium">No captions or hashtags were generated</p>
                  <p className="max-w-sm text-sm text-muted">
                    Processing finished but produced no content. Check the worker logs, then
                    re-upload the video to try again.
                  </p>
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Generating captions &amp; hashtags…</p>
                  <p className="max-w-sm text-sm text-muted">
                    This appears automatically once processing completes.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div role="tablist" className="flex flex-wrap gap-2">
              {platforms.map((p) => {
                const connected = connectedPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    role="tab"
                    aria-selected={active === p}
                    onClick={() => setActive(p)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active === p ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted-surface",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-success" : "bg-border")} aria-hidden />
                    {PLATFORM_LABEL[p] ?? p}
                  </button>
                );
              })}
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="caption" className="text-sm font-medium">Caption</label>
                    <span className={cn("text-xs tabular-nums", overLimit ? "text-danger" : "text-muted")}>
                      {captionText.length.toLocaleString()} / {captionLimit.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    id="caption"
                    value={captionText}
                    onChange={(e) => editCaption(e.target.value)}
                    rows={8}
                    className={cn(
                      "w-full resize-y rounded-lg border bg-surface p-3 text-sm leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      overLimit && "border-danger focus-visible:ring-danger/40",
                    )}
                    placeholder="Caption for this platform…"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="hashtags" className="flex items-center gap-1 text-sm font-medium">
                      <Hash className="h-3.5 w-3.5" /> Hashtags
                    </label>
                    <span className="text-xs tabular-nums text-muted">
                      {tagCount} tag{tagCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <textarea
                    id="hashtags"
                    value={tagMap[active] ?? ""}
                    onChange={(e) => editTags(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-lg border bg-surface p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    placeholder="#example #tags separated by spaces"
                  />
                </div>
                <button
                  type="button"
                  onClick={copyActive}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy caption + hashtags"}
                </button>
              </CardContent>
            </Card>
          </>
        )}

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
            <Button variant="outline" onClick={save} disabled={saving || publishing || !ready}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save edits
            </Button>
            {savedAt && !saving && <span className="text-sm text-muted">Saved ✓</span>}
          </div>
        )}

        {ready && (
          <>
            {/* Per-platform publishing status — accurate, driven by real posts. */}
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium">Publishing targets</p>
                <div className="space-y-2">
                  {ALL_PLATFORMS.map((p) => {
                    const Icon = PLATFORM_ICON[p];
                    const connected = connectedPlatforms.includes(p);
                    const contentReady = Boolean((captionMap[p] ?? "").trim()) && (tagMap[p] ?? "").trim().length > 0;
                    const post = postStatus[p];
                    return (
                      <div key={p} className="flex items-center gap-3 rounded-lg border p-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted-surface">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{PLATFORM_LABEL[p]}</p>
                          <p className="text-xs text-muted">
                            {connected
                              ? contentReady
                                ? "Content ready"
                                : "Caption/hashtags missing"
                              : "Not connected"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs">
                          {post ? (
                            <>
                              <PostStatusBadge status={post.status} />
                              {post.views != null && (
                                <span className="tabular-nums text-muted">{formatCompact(post.views)} views</span>
                              )}
                              {post.url && (
                                <a
                                  href={post.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted">
                              <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-success" : "bg-border")} />
                              {connected ? "Ready" : "—"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {connectedPlatforms.length === 0 && (
                  <p className="mt-2 text-xs text-muted">
                    No accounts connected — connect platforms in Settings to publish.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Video details */}
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium">Details</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Detail label="Resolution" value={width && height ? `${width}×${height}` : "—"} />
                  <Detail label="Duration" value={duration ? fmt(duration) : "—"} />
                  <Detail label="File size" value={fileSize ? formatBytes(fileSize) : "—"} />
                  <Detail label="Uploaded" value={uploadedLabel} />
                  <Detail label="Subtitles" value={processedUrl ? "Available" : "None"} />
                  <Detail label="Transcript" value={hasTranscript ? "Yes" : "None"} />
                </dl>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
