"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/fetcher";
import { formatBytes } from "@/lib/format";
import type { UsageRealtime } from "@/lib/flashproxy/types";

export function RealtimeCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["usage", "realtime"],
    queryFn: () => apiGet<UsageRealtime>("/api/usage/realtime"),
    refetchInterval: 10_000, // live-ish
  });

  const stats = [
    { label: "Active connections", value: data ? String(data.active_connections) : "—" },
    { label: "Active plans", value: data ? String(data.active_plans) : "—" },
    {
      label: "Throughput",
      value: data ? `${formatBytes(data.bytes_per_second)}/s` : "—",
    },
    {
      label: "Requests/s",
      value: data ? data.requests_per_second.toFixed(2) : "—",
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <h2 className="text-sm font-medium text-slate-500">Live activity</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              {s.label}
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {isLoading ? "…" : s.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
