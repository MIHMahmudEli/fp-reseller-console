import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api-response";

export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const url = new URL(request.url);
  const event = url.searchParams.get("event") || undefined;
  const resellerId = url.searchParams.get("resellerId") || undefined;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));

  const events = await prisma.auditLog.findMany({
    where: { ...(event ? { event } : {}), ...(resellerId ? { resellerId } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      event: true,
      method: true,
      path: true,
      status: true,
      ip: true,
      createdAt: true,
      metadata: true,
      reseller: { select: { label: true } },
    },
  });

  // Distinct event types for the filter UI.
  const eventTypes = await prisma.auditLog.findMany({
    distinct: ["event"],
    select: { event: true },
    orderBy: { event: "asc" },
  });

  return ok({ events, eventTypes: eventTypes.map((e) => e.event) });
}
