"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/fetcher";
import type { Balance } from "@/lib/flashproxy/types";

export function BalanceCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["balance"],
    queryFn: () => apiGet<Balance>("/api/balance"),
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-slate-500">Available balance</h2>

      {isLoading && (
        <div className="mt-3 h-9 w-40 animate-pulse rounded bg-slate-100" />
      )}

      {isError && (
        <p className="mt-3 text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load balance"}
        </p>
      )}

      {data && (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {data.balance_formatted}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Total spent: {data.total_spent_formatted}
          </p>
        </>
      )}
    </section>
  );
}
