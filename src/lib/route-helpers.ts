import "server-only";
import { getAuthedContext } from "./auth";
import { logAudit, type AuditEvent } from "./audit";
import { fail, ok, unauthorized } from "./api-response";
import { FlashProxyClient, FlashProxyError } from "./flashproxy/client";

/**
 * Standard authenticated GET handler: resolve the session, call FlashProxy via
 * the per-request client, write an audit row, and return our envelope. Keeps
 * every read route to a single declarative call.
 */
export async function authedGet<T>(
  event: AuditEvent,
  path: string,
  call: (client: FlashProxyClient) => Promise<{ data: T; status: number }>,
  metadata?: Record<string, unknown>,
) {
  const ctx = await getAuthedContext();
  if (!ctx) return unauthorized();

  try {
    const { data, status } = await call(ctx.client);
    await logAudit({
      resellerId: ctx.resellerId,
      event,
      method: "GET",
      path,
      status,
      metadata,
    });
    return ok(data);
  } catch (err) {
    if (err instanceof FlashProxyError) return fail(err.message, err.status, err.code);
    return fail("Upstream request failed", 502, "UPSTREAM_ERROR");
  }
}
