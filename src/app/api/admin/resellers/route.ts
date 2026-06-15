import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api-response";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();

  const resellers = await prisma.reseller.findMany({
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      label: true,
      lastBalanceCents: true,
      firstSeenAt: true,
      lastSeenAt: true,
      _count: { select: { auditLogs: true } },
    },
  });

  return ok({ resellers });
}
