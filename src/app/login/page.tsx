"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { apiPost, ApiError } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="animate-fade-in-up mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30">
            <Zap className="h-7 w-7" fill="currentColor" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            FlashProxy Console
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your reseller API key.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="animate-fade-in-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
          style={{ animationDelay: "80ms" }}
        >
          <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700">
            API key
          </label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="apiKey"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="fp_live_…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 font-mono text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              required
            />
          </div>

          {error && (
            <p className="animate-fade-in mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || apiKey.trim().length === 0}
            className="mt-5 w-full"
          >
            {loading ? "Verifying…" : "Sign in"}
          </Button>

          <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your key is verified against the FlashProxy API and stored only in an
            encrypted, http-only session cookie. It never reaches the browser.
          </p>
        </form>
      </div>
    </div>
  );
}
