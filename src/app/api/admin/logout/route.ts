import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { ok } from "@/lib/api-response";

export async function POST() {
  const session = await getSession();
  if (session.isAdmin) {
    await logAudit({
      event: "admin_logout",
      method: "POST",
      path: "/api/admin/logout",
      status: 200,
    });
  }
  session.isAdmin = false;
  await session.save();
  return ok({ isAdmin: false });
}
