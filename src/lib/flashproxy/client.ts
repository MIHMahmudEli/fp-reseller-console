import "server-only";
import { env } from "@/lib/env";
import type {
  ApiEnvelope,
  Balance,
  Destination,
  ErrorsPoint,
  LatencyPoint,
  MetricsSummary,
  Plan,
  PlansPage,
  PlanUsage,
  StatusCodesPoint,
  ThroughputPoint,
  TimeSeries,
  Transaction,
  TransactionsPage,
  UsageRealtime,
  UsageSummary,
} from "./types";

/** Thrown when the upstream API returns a non-success response. */
export class FlashProxyError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FlashProxyError";
  }
}

export interface CallResult {
  status: number;
  ok: boolean;
}

/**
 * Thin server-side client for the FlashProxy Reseller API. One instance per
 * request, constructed from the session's API key. The key only ever lives here
 * and in the encrypted cookie — never sent to the browser.
 */
export class FlashProxyClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    baseUrl: string = env.FLASHPROXY_API_BASE_URL,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /** Low-level GET. Returns the unwrapped `data` plus the HTTP status. */
  private async get<T>(path: string): Promise<{ data: T; status: number }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    let body: ApiEnvelope<T> | undefined;
    try {
      body = (await res.json()) as ApiEnvelope<T>;
    } catch {
      throw new FlashProxyError(res.status, "INVALID_JSON", "Upstream returned non-JSON");
    }

    if (!res.ok || !body?.success) {
      throw new FlashProxyError(
        res.status,
        body?.error?.code ?? "UPSTREAM_ERROR",
        body?.error?.message ?? `Request failed (${res.status})`,
      );
    }
    return { data: body.data as T, status: res.status };
  }

  /** Validate a key cheaply by hitting /balance. Returns the balance on success. */
  async verifyKey(): Promise<Balance> {
    return (await this.get<Balance>("/balance")).data;
  }

  getBalance() {
    return this.get<Balance>("/balance");
  }

  async getTransactions(): Promise<{ data: Transaction[]; status: number }> {
    const { data, status } = await this.get<TransactionsPage>("/balance/transactions");
    // Normalize live (`items`) vs sandbox (`transactions`).
    return { data: data.items ?? data.transactions ?? [], status };
  }

  getPricing() {
    return this.get<{ currency: string; products: Record<string, unknown> }>(
      "/balance/pricing",
    );
  }

  getUsageSummary() {
    return this.get<UsageSummary>("/usage/summary");
  }

  getUsageRealtime() {
    return this.get<UsageRealtime>("/usage/realtime");
  }

  getPlans() {
    return this.get<PlansPage>("/plans");
  }

  getPlan(planId: string) {
    return this.get<Plan>(`/plans/${encodeURIComponent(planId)}`);
  }

  getPlanUsage(planId: string) {
    return this.get<PlanUsage>(`/plans/${encodeURIComponent(planId)}/usage`);
  }

  // --- Metrics (caller must check product support; upstream 400s otherwise) ---
  getMetricsSummary(planId: string, hours = 24) {
    return this.get<MetricsSummary>(`/plans/${enc(planId)}/metrics/summary?hours=${hours}`);
  }
  getThroughput(planId: string, hours = 24) {
    return this.get<TimeSeries<ThroughputPoint>>(
      `/plans/${enc(planId)}/metrics/throughput?hours=${hours}`,
    );
  }
  getLatency(planId: string, hours = 24) {
    return this.get<TimeSeries<LatencyPoint>>(
      `/plans/${enc(planId)}/metrics/latency?hours=${hours}`,
    );
  }
  getErrors(planId: string, hours = 24) {
    return this.get<TimeSeries<ErrorsPoint>>(
      `/plans/${enc(planId)}/metrics/errors?hours=${hours}`,
    );
  }
  getStatusCodes(planId: string, hours = 24) {
    return this.get<TimeSeries<StatusCodesPoint>>(
      `/plans/${enc(planId)}/metrics/status-codes?hours=${hours}`,
    );
  }
  getDestinations(planId: string, hours = 24, limit = 30) {
    return this.get<{ hours: number; destinations: Destination[] }>(
      `/plans/${enc(planId)}/metrics/destinations?hours=${hours}&limit=${limit}`,
    );
  }
  getHourlyUsage(planId: string, hours = 24) {
    return this.get<{ hours: number; total_gb: number; hourly: unknown[] }>(
      `/plans/${enc(planId)}/metrics/hourly-usage?hours=${hours}`,
    );
  }
}

const enc = encodeURIComponent;
