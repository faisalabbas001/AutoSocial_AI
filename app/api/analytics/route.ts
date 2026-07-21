import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessId } from "@/lib/current";

export const dynamic = "force-dynamic";

export async function GET() {
  const businessId = await requireBusinessId();
  const where = { scheduledPost: { video: { businessId } } };

  const [totals, posts] = await Promise.all([
    prisma.analytics.aggregate({
      where,
      _sum: { views: true, likes: true, comments: true, shares: true, reach: true },
    }),
    prisma.scheduledPost.findMany({
      where: { video: { businessId }, status: "PUBLISHED" },
      include: { analytics: true, video: { select: { title: true } } },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ totals: totals._sum, posts });
}
