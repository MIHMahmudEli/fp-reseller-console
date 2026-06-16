import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api-response";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();

  const resellers = await prisma.reseller.findMany({
    select: {
      id: true,
      label: true,
      lastBalanceCents: true,
      firstSeenAt: true,
      lastSeenAt: true,
      _count: { select: { auditLogs: true } },
      // Most recent audited action = true "last seen" (the row's lastSeenAt only
      // updates on login, so it would otherwise never reflect ongoing activity).
      auditLogs: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const rows = resellers
    .map(({ auditLogs, ...r }) => ({
      ...r,
      lastSeenAt: auditLogs[0]?.createdAt ?? r.lastSeenAt,
    }))
    .sort((a, b) => +new Date(b.lastSeenAt) - +new Date(a.lastSeenAt));

  return ok({ resellers: rows });
}
