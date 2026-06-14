"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/fetcher";

export function AppHeader({ label }: { label: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await apiPost("/api/auth/logout");
    } finally {
      router.replace("/login");
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="font-semibold tracking-tight">FlashProxy Console</div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">
            Key <span className="font-mono text-slate-700">{label}</span>
          </span>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}
