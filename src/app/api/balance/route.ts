import { getAuthedContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { fail, ok, unauthorized } from "@/lib/api-response";
import { FlashProxyError } from "@/lib/flashproxy/client";

export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return unauthorized();

  try {
    const { data, status } = await ctx.client.getBalance();
    await logAudit({
      resellerId: ctx.resellerId,
      event: "view_balance",
      method: "GET",
      path: "/api/balance",
      status,
    });
    return ok(data);
  } catch (err) {
    if (err instanceof FlashProxyError) return fail(err.message, err.status, err.code);
    return fail("Failed to load balance", 502);
  }
}
