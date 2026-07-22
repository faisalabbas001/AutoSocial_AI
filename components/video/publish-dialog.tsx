"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
};

export function PublishDialog({
  videoId,
  connectedPlatforms,
  disabled,
}: {
  videoId: string;
  connectedPlatforms: string[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(connectedPlatforms);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState(() => defaultWhen());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggle(p: string) {
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  async function submit() {
    if (selected.length === 0) {
      setError("Pick at least one platform.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        platforms: selected,
        scheduledAt: mode === "schedule" ? new Date(when).toISOString() : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Publish failed. Is the worker running?");
      return;
    }
    setDone(true);
    router.refresh();
    setTimeout(() => {
      setOpen(false);
      setDone(false);
    }, 1400);
  }

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title="Publish"
        aria-label="Publish"
        className="h-8 w-8 shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-surface shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold">Publish video</h3>
              <button onClick={() => !busy && setOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <p className="font-medium">{mode === "schedule" ? "Scheduled!" : "Publishing!"}</p>
                <p className="text-sm text-muted">Track it on the Schedule page.</p>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <div>
                  <p className="text-sm font-medium mb-2">Platforms</p>
                  <div className="grid grid-cols-2 gap-2">
                    {connectedPlatforms.length === 0 && (
                      <p className="text-sm text-muted col-span-2">No connected accounts. Connect one in Settings.</p>
                    )}
                    {connectedPlatforms.map((p) => (
                      <label
                        key={p}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors",
                          selected.includes(p) ? "border-primary bg-primary-soft" : "hover:bg-muted-surface",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(p)}
                          onChange={() => toggle(p)}
                          className="accent-[var(--primary)]"
                        />
                        {PLATFORM_LABEL[p] ?? p}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">When</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode("now")}
                      className={cn(
                        "flex-1 rounded-lg border p-2 text-sm transition-colors",
                        mode === "now" ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted-surface",
                      )}
                    >
                      Publish now
                    </button>
                    <button
                      onClick={() => setMode("schedule")}
                      className={cn(
                        "flex-1 rounded-lg border p-2 text-sm transition-colors",
                        mode === "schedule" ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted-surface",
                      )}
                    >
                      Schedule
                    </button>
                  </div>
                  {mode === "schedule" && (
                    <input
                      type="datetime-local"
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      className="mt-2 w-full rounded-lg border bg-surface p-2 text-sm"
                    />
                  )}
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button onClick={submit} disabled={busy || connectedPlatforms.length === 0}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "schedule" ? "Schedule" : "Publish now"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Default schedule time: one hour from now, formatted for datetime-local. */
function defaultWhen(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
