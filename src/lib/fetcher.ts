/**
 * Browser-side fetch helpers for our own /api routes. These talk only to our
 * backend (never to FlashProxy directly), matching the BFF boundary.
 */

interface ApiOk<T> {
  ok: true;
  data: T;
}
interface ApiErr {
  ok: false;
  error: { message: string; code?: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiOk<T> | ApiErr;
  if (!res.ok || !json.ok) {
    const message = !json.ok ? json.error.message : `Request failed (${res.status})`;
    const code = !json.ok ? json.error.code : undefined;
    throw new ApiError(res.status, message, code);
  }
  return json.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { headers: { Accept: "application/json" } }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}
