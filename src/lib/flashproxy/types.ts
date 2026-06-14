/**
 * Types for the FlashProxy Reseller API responses.
 * Derived from live exploration — see docs/api-findings.md.
 * These describe the `data` payload inside the `{ success, data }` envelope.
 */

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// --- Balance ---
export interface Balance {
  balance_cents: number;
  balance_formatted: string;
  total_spent_cents: number;
  total_spent_formatted: string;
  allocations: Record<string, unknown> | null;
}

export interface Transaction {
  id: string;
  type: string; // "topup" | "purchase" | ...
  amount_cents: number;
  description: string;
  plan_id?: string;
  created_at: string;
}

export interface TransactionsPage {
  // NB: live returns `items`, sandbox returns `transactions`. Client normalizes.
  items?: Transaction[];
  transactions?: Transaction[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// --- Usage ---
export interface UsageSummary {
  time_range: { start: number; end: number; period: string };
  summary: {
    total_bytes: number;
    total_gb: number;
    total_requests: number;
    active_plans: number;
  };
  by_product: Record<string, { bytes: number; plans: number }>;
  daily_breakdown: Array<{ date: string; bytes: number; gb: number }>;
}

export interface UsageRealtime {
  active_plans: number;
  active_connections: number;
  bytes_last_5min?: number;
  requests_last_5min?: number;
  bytes_per_second: number;
  requests_per_second: number;
  timestamp?: number;
}

// --- Plans ---
export interface PlanConnection {
  hostname: string;
  port_http: number;
  port_socks: number;
  format: string;
}

export interface PlanLimits {
  max_gb: number;
  max_bytes: number;
  max_mbps: number | null;
  bytes_used: number;
}

export interface Plan {
  plan_id: string;
  product: string;
  billing_type: string;
  proxy_username: string;
  proxy_password: string;
  connection: PlanConnection;
  limits: PlanLimits;
  expires_at: string;
  status: string;
  created_at: string;
  allowed_ips?: string[];
  end_user_reference?: string | null;
  proxy_list?: unknown;
}

export interface PlansPage {
  plans: Plan[];
  pagination: Pagination;
}

export interface PlanUsage {
  plan_id: string;
  bytes_used: number;
  gb_used: number;
  max_bytes: number;
  max_gb: number;
  percentage_used: string;
  expires_at: string;
  days_remaining: number;
}

// --- Metrics (only for datacenter, shared_isp, ipv6_residential, ipv6_datacenter) ---
export const METRICS_SUPPORTED_PRODUCTS = [
  "datacenter",
  "shared_isp",
  "ipv6_residential",
  "ipv6_datacenter",
] as const;

export interface MetricsSummary {
  hours: number;
  total_bytes: number;
  total_mb: number;
  total_up_bytes: number;
  total_down_bytes: number;
  up_mb: number;
  down_mb: number;
  total_connections: number;
  total_successes: number;
  total_errors: number;
  success_rate_pct: number | null;
  peak_concurrent: number;
  avg_mbps: number;
  peak_mbps: number;
  burst_mbps: number;
  samples: number;
}

export interface ThroughputPoint {
  bucket: string;
  mbps: number;
  peak_mbps: number;
  burst_mbps: number;
  rate_cap_mbps: number;
  samples: number;
}

export interface LatencyPoint {
  bucket: string;
  p50: number;
  p95: number;
  p99: number;
}

export interface ErrorsPoint {
  bucket: string;
  dns: number;
  tcp: number;
  tls: number;
  timeout: number;
  auth: number;
  upstream_4xx: number;
  upstream_5xx: number;
  zero_byte: number;
  proxy_internal: number;
  client_disconnect: number;
  socks5_protocol: number;
  bad_request: number;
  conn_limit: number;
  bandwidth_quota: number;
  blacklisted: number;
  upstream_select: number;
}

export interface StatusCodesPoint {
  bucket: string;
  s2xx: number;
  s3xx: number;
  s4xx: number;
  s5xx: number;
}

export interface Destination {
  destination: string;
  connections: number;
  successes: number;
  errors: number;
  mb_received: number;
  mb_sent: number;
  p95_ms: number;
}

export interface TimeSeries<T> {
  hours: number;
  bucket_minutes: number;
  series: T[];
}
