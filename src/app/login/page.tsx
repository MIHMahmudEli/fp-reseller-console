"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiError } from "@/lib/fetcher";

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/auth/login", { apiKey });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            FlashProxy Reseller Console
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your reseller API key.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700">
            API key
          </label>
          <input
            id="apiKey"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="fp_live_…"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            required
          />

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || apiKey.trim().length === 0}
            className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Your key is verified against the FlashProxy API and stored only in an
            encrypted, http-only session cookie. It never reaches the browser.
          </p>
        </form>
      </div>
    </div>
  );
}
