import { getSession } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();
  if (!session.resellerId) return unauthorized();
  return ok({ label: session.label, loggedInAt: session.loggedInAt });
}
