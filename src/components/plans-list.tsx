"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Server } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { formatDate, formatGB, productLabel, statusClasses } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlansPage } from "@/lib/flashproxy/types";

function usagePct(used: number, max: number): number {
  if (!max) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

export function PlansList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["plans"],
    queryFn: () => apiGet<PlansPage>("/api/plans"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {(error as Error)?.message ?? "Failed to load plans"}
      </p>
    );
  }

  const plans = data?.plans ?? [];

  if (plans.length === 0) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Server className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-slate-700">No plans yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          When you purchase a proxy plan it will appear here with its usage,
          connection details, and performance metrics.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="animate-fade-in-up hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p) => {
              const pct = usagePct(p.limits.bytes_used, p.limits.max_bytes);
              return (
                <tr key={p.plan_id} className="group transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{productLabel(p.product)}</div>
                    <div className="font-mono text-xs text-slate-400">
                      {p.plan_id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusClasses(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <UsageMini
                      pct={pct}
                      used={p.limits.bytes_used}
                      max={p.limits.max_gb}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.expires_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/plans/${p.plan_id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                    >
                      View
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {plans.map((p, i) => {
          const pct = usagePct(p.limits.bytes_used, p.limits.max_bytes);
          return (
            <Link
              key={p.plan_id}
              href={`/plans/${p.plan_id}`}
              style={{ animationDelay: `${i * 50}ms` }}
              className="animate-fade-in-up block rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-900">{productLabel(p.product)}</div>
                <Badge className={statusClasses(p.status)}>{p.status}</Badge>
              </div>
              <div className="mt-3">
                <UsageMini pct={pct} used={p.limits.bytes_used} max={p.limits.max_gb} />
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Expires {formatDate(p.expires_at)}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function UsageMini({ pct, used, max }: { pct: number; used: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-500">
        {formatGB(used / 1e9)} / {max} GB
      </span>
    </div>
  );
}
