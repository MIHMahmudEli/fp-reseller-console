"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { apiPost, ApiError } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/admin/login", { token });
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
      >
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight">Operator access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the admin token to view the audit log.
        </p>
        <div className="relative mt-4">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            required
          />
        </div>
        {error && (
          <p className="animate-fade-in mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading || token.length === 0} className="mt-4 w-full">
          {loading ? "Checking…" : "Enter"}
        </Button>
      </form>
    </div>
  );
}
