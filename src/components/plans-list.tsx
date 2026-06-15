"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/fetcher";
import { formatDate, formatGB, productLabel, statusClasses } from "@/lib/format";
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
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {(error as Error)?.message ?? "Failed to load plans"}
      </p>
    );
  }

  const plans = data?.plans ?? [];

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-700">No plans yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          When you purchase a proxy plan it will appear here with its usage,
          connection details, and performance metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
              <tr key={p.plan_id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {productLabel(p.product)}
                  </div>
                  <div className="font-mono text-xs text-slate-400">
                    {p.plan_id.slice(0, 8)}…
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses(p.status)}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatGB(p.limits.bytes_used / 1e9)} / {p.limits.max_gb} GB
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(p.expires_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/plans/${p.plan_id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
