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
  // Time-billed products (e.g. unlimited_residential) price by the day via tiers.
  const tiers = v.pricing_tiers as Array<Record<string, unknown>> | undefined;
  const tier = tiers?.find((t) => typeof t.price_per_day_cents === "number");
  if (tier) {
    const perDay = (tier.price_per_day_cents as number) / 100;
    return { price: `$${perDay}/day`, kind: type || "time" };
  }
  if (typeof v.trial_price_formatted === "string") {
    return { price: `${v.trial_price_formatted} trial`, kind: type || "time" };
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
