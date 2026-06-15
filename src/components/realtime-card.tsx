"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Gauge, Link2, Server } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { formatBytes } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { UsageRealtime } from "@/lib/flashproxy/types";

export function RealtimeCard({ delay }: { delay?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["usage", "realtime"],
    queryFn: () => apiGet<UsageRealtime>("/api/usage/realtime"),
    refetchInterval: 10_000,
  });

  const stats = [
    {
      label: "Active connections",
      value: data ? String(data.active_connections) : "—",
      icon: Link2,
    },
    { label: "Active plans", value: data ? String(data.active_plans) : "—", icon: Server },
    {
      label: "Throughput",
      value: data ? `${formatBytes(data.bytes_per_second)}/s` : "—",
      icon: Gauge,
    },
    {
      label: "Requests/s",
      value: data ? data.requests_per_second.toFixed(2) : "—",
      icon: Activity,
    },
  ];

  return (
    <Card className="p-6" delay={delay}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <h2 className="text-sm font-medium text-slate-500">Live activity</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <div className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">
                {isLoading ? "…" : s.value}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
