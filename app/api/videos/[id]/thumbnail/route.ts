import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessId } from "@/lib/current";
import { putObject } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Set the primary thumbnail for a video. Two modes:
 *  - JSON  { thumbnailId }        → promote an existing candidate to primary
 *  - multipart form-data (file)   → upload a custom image and make it primary
 * Both are scoped to the caller's business.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const businessId = await requireBusinessId();

  const video = await prisma.video.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";

  // Custom image upload.
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "An image file is required" }, { status: 400 });
    }
    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await putObject(`thumbnails/${id}/custom-${Date.now()}.${ext}`, buf, file.type);

    await prisma.$transaction([
      prisma.thumbnail.updateMany({ where: { videoId: id }, data: { isPrimary: false } }),
      prisma.thumbnail.create({ data: { videoId: id, url, isPrimary: true } }),
    ]);
    return NextResponse.json({ ok: true, url });
  }

  // Promote an existing candidate.
  const body = await req.json().catch(() => null);
  const thumbnailId = body?.thumbnailId;
  if (typeof thumbnailId !== "string") {
    return NextResponse.json({ error: "thumbnailId is required" }, { status: 400 });
  }
  const target = await prisma.thumbnail.findFirst({ where: { id: thumbnailId, videoId: id } });
  if (!target) return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.thumbnail.updateMany({ where: { videoId: id }, data: { isPrimary: false } }),
    prisma.thumbnail.update({ where: { id: thumbnailId }, data: { isPrimary: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
