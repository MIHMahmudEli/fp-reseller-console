"use client";

import { useQuery } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { productLabel } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Pricing {
  currency: string;
  products: Record<string, unknown>;
}

function priceSummary(value: unknown): { price: string; kind: string } {
  const v = (value ?? {}) as Record<string, unknown>;
  const type = typeof v.type === "string" ? v.type : "";

  if (typeof v.price_per_gb === "number") {
    return { price: `$${v.price_per_gb}/GB`, kind: "bandwidth" };
  }
  if (typeof v.price_per_ip_30_days === "number") {
    return { price: `$${v.price_per_ip_30_days}/IP·30d`, kind: "per IP" };
  }
  const bandwidth = v.bandwidth as Record<string, unknown> | undefined;
  if (bandwidth && typeof bandwidth.price_per_gb === "number") {
    return { price: `$${bandwidth.price_per_gb}/GB`, kind: type || "hybrid" };
  }
  // Time-billed products (e.g. unlimited_residential) price per period, keyed by
  // bandwidth (Mbps) then duration. Surface the cheapest day rate as a "from".
  const basePrices = v.base_prices as Record<string, Record<string, number>> | undefined;
  if (basePrices) {
    const dayRates = Object.values(basePrices)
      .map((d) => d?.["1_day"])
      .filter((n): n is number => typeof n === "number");
    if (dayRates.length > 0) {
      return { price: `from $${Math.min(...dayRates)}/day`, kind: type || "time" };
    }
  }
  return { price: "—", kind: type || "custom" };
}

export function PricingTable({ delay }: { delay?: number }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pricing"],
    queryFn: () => apiGet<Pricing>("/api/balance/pricing"),
  });

  return (
    <Card className="p-5" delay={delay}>
      <CardHeader title="Your pricing" icon={<Tags className="h-4 w-4" />} />

      {isLoading ? (
        <Skeleton className="mt-4 h-32 w-full" />
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load pricing"}
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(data?.products ?? {}).map(([product, value]) => {
            const { price, kind } = priceSummary(value);
            return (
              <div
                key={product}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 transition-colors hover:bg-subtle"
              >
                <div>
                  <div className="text-sm font-medium text-fg">
                    {productLabel(product)}
                  </div>
                  <div className="text-xs text-faint">{kind}</div>
                </div>
                <div className="font-mono text-sm font-medium text-fg">{price}</div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
