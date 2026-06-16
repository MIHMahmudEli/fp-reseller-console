"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
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
import { tooltipStyle } from "@/lib/chart";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsageSummary } from "@/lib/flashproxy/types";

export function UsageSummaryCard({ delay }: { delay?: number }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["usage", "summary"],
    queryFn: () => apiGet<UsageSummary>("/api/usage/summary"),
  });

  if (isError) {
    return (
      <Card className="p-6" delay={delay}>
        <p className="text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load usage"}
        </p>
      </Card>
    );
  }

  const daily =
    data?.daily_breakdown.map((d) => ({ date: d.date.slice(5), gb: d.gb })) ?? [];
  const byProduct = Object.entries(data?.by_product ?? {});

  // The API's daily_breakdown is often empty for sub-day usage even when there
  // IS traffic — fall back to a per-product breakdown so the chart isn't blank.
  const chart =
    daily.length > 0
      ? { data: daily, key: "date", label: "Daily" }
      : {
          data: byProduct.map(([p, v]) => ({
            date: productLabel(p),
            gb: Number((v.bytes / 1e9).toFixed(4)),
          })),
          key: "date",
          label: "By product",
        };
  const hasChart = chart.data.some((d) => d.gb > 0);

  return (
    <Card className="p-6" delay={delay}>
      <CardHeader title="Usage (last 24h)" icon={<BarChart3 className="h-4 w-4" />} />

      {isLoading ? (
        <Skeleton className="mt-4 h-48 w-full" />
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

          {hasChart ? (
            <div className="mt-6">
              <div className="mb-2 text-xs uppercase tracking-wide text-faint">
                {chart.label}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" tickLine={false} />
                  <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v) => [`${v} GB`, "Usage"]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="gb" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-6 flex h-24 items-center justify-center rounded-xl bg-subtle text-sm text-faint">
              No usage recorded in this window
            </div>
          )}

          {byProduct.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {byProduct.map(([product, v]) => (
                <div key={product} className="flex justify-between text-sm">
                  <span className="text-muted">{productLabel(product)}</span>
                  <span className="font-medium tabular-nums text-fg">
                    {formatGB(v.bytes / 1e9)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-fg">
        {value}
      </div>
    </div>
  );
}
