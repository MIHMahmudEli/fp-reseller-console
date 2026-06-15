import "server-only";
import { getSession } from "./session";

/** True when the current session has authenticated as the operator. */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session.isAdmin === true;
}
