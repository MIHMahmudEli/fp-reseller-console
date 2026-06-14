import "server-only";
import { NextResponse } from "next/server";

/** Standard success envelope for our own /api routes. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Standard error envelope for our own /api routes. */
export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: { message, code } }, { status });
}

/** 401 helper for unauthenticated requests. */
export function unauthorized() {
  return fail("Not authenticated", 401, "UNAUTHENTICATED");
}
