import { BalanceCard } from "@/components/balance-card";
import { PricingTable } from "@/components/pricing-table";
import { TransactionsTable } from "@/components/transactions-table";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Balance, transactions, and your pricing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BalanceCard />
        <div className="lg:col-span-2">
          <PricingTable />
        </div>
      </div>

      <TransactionsTable />
    </div>
  );
}
