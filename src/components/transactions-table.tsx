"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/flashproxy/types";

export function TransactionsTable() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiGet<Transaction[]>("/api/balance/transactions"),
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-medium text-slate-500">
        Transactions
      </h2>

      {isLoading ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <p className="px-5 py-4 text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load transactions"}
        </p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          No transactions yet
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-5 py-2 font-medium">Type</th>
              <th className="px-5 py-2 font-medium">Description</th>
              <th className="px-5 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data!.map((t) => {
              const negative = t.amount_cents < 0;
              return (
                <tr key={t.id}>
                  <td className="px-5 py-2.5 text-slate-500">{formatDate(t.created_at)}</td>
                  <td className="px-5 py-2.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {t.type}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-slate-700">{t.description}</td>
                  <td
                    className={`px-5 py-2.5 text-right font-medium ${
                      negative ? "text-slate-900" : "text-emerald-600"
                    }`}
                  >
                    {negative ? "-" : "+"}${Math.abs(t.amount_cents / 100).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
