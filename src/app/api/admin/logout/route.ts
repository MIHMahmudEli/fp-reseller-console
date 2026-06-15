import { getSession } from "@/lib/session";
import { ok } from "@/lib/api-response";

export async function POST() {
  const session = await getSession();
  session.isAdmin = false;
  await session.save();
  return ok({ isAdmin: false });
}
