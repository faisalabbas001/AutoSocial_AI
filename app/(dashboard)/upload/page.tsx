"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileVideo, CheckCircle2, Loader2 } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";

type Phase = "idle" | "selected" | "uploading" | "done";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const onSelect = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, MOV, AVI, MKV, WebM).");
      return;
    }
    setError(null);
    setFile(f);
    setPhase("selected");
  }, []);

  async function startUpload() {
    if (!file) return;
    setPhase("uploading");
    setError(null);

    // Read duration from the file for a realistic record.
    const duration = await readDuration(file).catch(() => undefined);

    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: file.name.replace(/\.[^.]+$/, ""),
        fileSize: file.size,
        duration,
      }),
    });

    if (!res.ok) {
      setError("Upload failed. Is the dev server + database running?");
      setPhase("selected");
      return;
    }

    setPhase("done");
    setTimeout(() => router.push("/videos"), 1200);
  }

  return (
    <>
      <Topbar title="Upload Video" subtitle="Drop a raw video — AI handles the rest" />
      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload a new video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onSelect(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
                dragging ? "border-primary bg-primary-soft" : "border-border hover:bg-muted-surface",
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Drag & drop your video here</p>
                <p className="text-sm text-muted">or click to browse — MP4, MOV, AVI, MKV, WebM up to 2GB</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-surface text-primary">
                  <FileVideo className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted">{formatBytes(file.size)}</p>
                </div>
                {phase === "done" && <CheckCircle2 className="h-5 w-5 text-success" />}
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex items-center gap-2">
              <Button onClick={startUpload} disabled={!file || phase === "uploading" || phase === "done"}>
                {phase === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
                {phase === "done" ? "Queued for processing!" : phase === "uploading" ? "Uploading…" : "Upload & Process"}
              </Button>
              {file && phase === "selected" && (
                <Button variant="ghost" onClick={() => { setFile(null); setPhase("idle"); }}>
                  Cancel
                </Button>
              )}
            </div>

            <p className="text-xs text-muted">
              After upload, the AI pipeline runs: transcription → subtitles → silence removal → editing →
              thumbnail → captions → hashtags. Start the worker with{" "}
              <code className="rounded bg-muted-surface px-1 py-0.5">npm run workers</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** Read a video file's duration (seconds) in the browser. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      resolve(Math.round(el.duration));
    };
    el.onerror = reject;
    el.src = URL.createObjectURL(file);
  });
}
