import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessId } from "@/lib/current";
import { createUploadUrl, videoKey, publicUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().refine((t) => t.startsWith("video/"), "must be a video"),
});

/**
 * Mint a presigned PUT URL so the browser uploads the video bytes straight to
 * object storage — no buffering through the Node server, so large files (GBs)
 * don't OOM or hit the route timeout.
 */
export async function POST(req: NextRequest) {
  const businessId = await requireBusinessId();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const key = videoKey(businessId, parsed.data.filename);
  try {
    const url = await createUploadUrl(key, parsed.data.contentType);
    return NextResponse.json({ key, url, publicUrl: publicUrl(key) });
  } catch {
    // Presign unavailable (e.g. storage config) — client falls back to /api/upload.
    return NextResponse.json({ error: "presign_unavailable" }, { status: 503 });
  }
}
