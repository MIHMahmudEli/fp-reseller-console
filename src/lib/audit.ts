import "server-only";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditEvent =
  | "login_success"
  | "login_failure"
  | "logout"
  | "admin_login_success"
  | "admin_logout"
  | "view_balance"
  | "view_transactions"
  | "view_pricing"
  | "view_usage"
  | "view_plans"
  | "view_plan"
  | "view_metrics";

interface LogInput {
  /** Omitted for operator/system events (e.g. admin login). */
  resellerId?: string;
  event: AuditEvent;
  method?: string;
  path?: string;
  status?: number;
  metadata?: Record<string, unknown>;
}

/** Best-effort client IP from common proxy headers. */
async function clientContext() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

/**
 * Write an audit row. Best-effort: failures are swallowed and logged to the
 * server console so auditing never breaks the user-facing request.
 */
export async function logAudit(input: LogInput): Promise<void> {
  try {
    const { ip, userAgent } = await clientContext();
    const data: Prisma.AuditLogUncheckedCreateInput = {
      event: input.event,
      method: input.method,
      path: input.path,
      status: input.status,
      ip,
      userAgent,
      // resellerId is null for operator/system events (e.g. admin login).
      resellerId: input.resellerId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    };
    await prisma.auditLog.create({ data });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}

/**
 * Upsert the reseller record by key hash on login. Stores no raw key — only the
 * hash, a display label, and a balance snapshot. Returns the reseller id.
 */
export async function upsertReseller(params: {
  keyHash: string;
  label: string;
  balanceCents?: number;
}): Promise<string> {
  const reseller = await prisma.reseller.upsert({
    where: { keyHash: params.keyHash },
    create: {
      keyHash: params.keyHash,
      label: params.label,
      lastBalanceCents: params.balanceCents,
    },
    update: {
      label: params.label,
      lastBalanceCents: params.balanceCents,
    },
  });
  return reseller.id;
}
