"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet } from "@/lib/fetcher";
import { formatGB, productLabel } from "@/lib/format";
import type { UsageSummary } from "@/lib/flashproxy/types";

export function UsageSummaryCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["usage", "summary"],
    queryFn: () => apiGet<UsageSummary>("/api/usage/summary"),
  });

  if (isError) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load usage"}
        </p>
      </section>
    );
  }

  const daily =
    data?.daily_breakdown.map((d) => ({ date: d.date.slice(5), gb: d.gb })) ?? [];
  const byProduct = Object.entries(data?.by_product ?? {});

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-500">Usage (last 24h)</h2>

      {isLoading ? (
        <div className="mt-4 h-48 animate-pulse rounded bg-slate-100" />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <Stat label="Total" value={formatGB(data?.summary.total_gb ?? 0)} />
            <Stat
              label="Requests"
              value={(data?.summary.total_requests ?? 0).toLocaleString()}
            />
            <Stat label="Active plans" value={String(data?.summary.active_plans ?? 0)} />
          </div>

          {daily.length > 0 ? (
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => `${v} GB`} />
                  <Bar dataKey="gb" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-6 flex h-24 items-center justify-center text-sm text-slate-400">
              No usage recorded in this window
            </div>
          )}

          {byProduct.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {byProduct.map(([product, v]) => (
                <div key={product} className="flex justify-between text-sm">
                  <span className="text-slate-600">{productLabel(product)}</span>
                  <span className="font-medium text-slate-900">
                    {formatGB(v.bytes / 1e9)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
