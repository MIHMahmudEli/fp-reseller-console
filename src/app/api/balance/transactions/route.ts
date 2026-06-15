import { authedGet } from "@/lib/route-helpers";

export function GET() {
  return authedGet(
    "view_transactions",
    "/api/balance/transactions",
    (c) => c.getTransactions(),
  );
}
