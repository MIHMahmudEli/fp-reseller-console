import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "./env";

/**
 * What we keep in the encrypted session cookie. The raw API key lives ONLY here
 * (AES-encrypted, httpOnly) so the server can call FlashProxy per request.
 */
export interface SessionData {
  apiKey?: string;
  resellerId?: string;
  keyHash?: string;
  label?: string;
  loggedInAt?: number;
}

export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: "fp_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** Throwing helper for routes that require an authenticated reseller. */
export async function requireSession() {
  const session = await getSession();
  if (!session.apiKey || !session.resellerId) {
    return null;
  }
  return session;
}
