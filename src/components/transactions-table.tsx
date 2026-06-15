"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from "@/lib/flashproxy/types";

export function TransactionsTable({ delay }: { delay?: number }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiGet<Transaction[]>("/api/balance/transactions"),
  });

  return (
    <Card delay={delay}>
      <div className="flex items-center gap-2 border-b border-slate-200/70 px-5 py-3">
        <Receipt className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-medium text-slate-500">Transactions</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="px-5 py-4 text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load transactions"}
        </p>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Receipt className="h-5 w-5" />
          </span>
          <p className="text-sm text-slate-400">No transactions yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data!.map((t) => {
            const negative = t.amount_cents < 0;
            return (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    negative ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {negative ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {t.description}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDate(t.created_at)} · {t.type}
                  </div>
                </div>
                <div
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    negative ? "text-slate-900" : "text-emerald-600"
                  }`}
                >
                  {negative ? "-" : "+"}${Math.abs(t.amount_cents / 100).toFixed(2)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
