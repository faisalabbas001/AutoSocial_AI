import { prisma } from "@/lib/db";

/**
 * Demo single-tenant helper: returns the first (seeded) business with its owner.
 * In a multi-tenant build this resolves from the authenticated session instead.
 */
export async function getCurrentBusiness() {
  const business = await prisma.business.findFirst({
    orderBy: { createdAt: "asc" },
    include: { user: { include: { subscription: true } } },
  });
  return business;
}

export async function requireBusinessId(): Promise<string> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No business found — run `npm run prisma:seed`");
  return business.id;
}
