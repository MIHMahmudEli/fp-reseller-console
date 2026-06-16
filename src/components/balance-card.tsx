"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Balance } from "@/lib/flashproxy/types";

export function BalanceCard({ delay }: { delay?: number }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["balance"],
    queryFn: () => apiGet<Balance>("/api/balance"),
  });

  return (
    <Card className="p-6" hover delay={delay}>
      <CardHeader title="Available balance" icon={<Wallet className="h-4 w-4" />} />

      {isLoading && <Skeleton className="mt-3 h-9 w-40" />}

      {isError && (
        <p className="mt-3 text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load balance"}
        </p>
      )}

      {data && (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-fg">
            {data.balance_formatted}
          </p>
          <p className="mt-1 text-sm text-muted">
            Total spent: {data.total_spent_formatted}
          </p>
        </>
      )}
    </Card>
  );
}
