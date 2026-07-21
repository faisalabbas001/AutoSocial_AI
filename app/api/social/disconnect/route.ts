import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessId } from "@/lib/current";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Disconnect a social account (native form POST from the Settings page). */
export async function POST(req: NextRequest) {
  const businessId = await requireBusinessId();
  const form = await req.formData();
  const accountId = form.get("accountId");

  if (typeof accountId === "string") {
    // Scope the delete to the current business to prevent cross-tenant removal.
    await prisma.socialAccount.deleteMany({ where: { id: accountId, businessId } });
  }
  return NextResponse.redirect(`${appUrl}/settings`, { status: 303 });
}
