"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Delete a video (with a confirm). Refreshes the list on success. */
export function DeleteVideoButton({ videoId, title }: { videoId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete "${title}"? This removes its captions, hashtags and posts and can't be undone.`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else window.alert("Couldn't delete the video. Please try again.");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={busy}
      title="Delete video"
      aria-label="Delete video"
      className="h-8 w-8 shrink-0 text-muted hover:text-danger"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
