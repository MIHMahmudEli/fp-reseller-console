import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { ok } from "@/lib/api-response";

export async function POST() {
  const session = await getSession();
  if (session.resellerId) {
    await logAudit({
      resellerId: session.resellerId,
      event: "logout",
      method: "POST",
      path: "/api/auth/logout",
      status: 200,
    });
  }
  session.destroy();
  return ok({ loggedOut: true });
}
