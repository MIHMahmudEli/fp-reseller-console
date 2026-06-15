# FlashProxy API — Exploration Findings

Notes from probing the live + sandbox API before building. Raw JSON samples are
in `.api-samples/` (gitignored). The full OpenAPI spec is `docs/api.json`.

## Basics

- **Base URLs:** live `https://rapi.flashproxy.com/api/v1`, sandbox
  `https://rapi.flashproxy.com/sandbox/api/v1`.
- **Auth:** `Authorization: Bearer <key>`. Keys are prefixed `fp_live_` / `fp_test_`.
- **Envelope:** success → `{ "success": true, "data": {...} }`;
  error → `{ "success": false, "error": { "code", "message" } }`.
- **Rate limit:** 100 req/min per key, burst 20 concurrent. Headers included.
- **Idempotency:** `X-Idempotency-Key` (UUID) on mutating calls, cached 24h.
- **Optional HMAC:** `X-Signature` + `X-Timestamp` (within 5 min).

## Live vs sandbox differences (must handle both / not trust sandbox shapes)

| Area | Sandbox | Live |
|------|---------|------|
| Transactions list key | `data.transactions` | `data.items` |
| Pools item shape | `{pool,title,country,available,price_cents,...}` | `{pool,inStock,stock,title,provider,isSubnet}` |
| Pricing | fewer products, no `mode` | hybrid/time tiers + `mode` field |
| `/metrics/*` | **404 (not implemented)** | implemented |
| `/geo/catalog` | 404 | needs `?product=` |
| product echo on create | `residential-lite` | `residential_lite` (underscore) |

## Endpoints verified working

**Account (read-only, no plan needed):** `/balance`, `/balance/transactions`,
`/balance/pricing`, `/usage/summary`, `/usage/realtime`, `/proxies/pools`,
`/proxies/stock?product_type=`, `/sub-users`.

**Plan lifecycle (verified create→read→cancel):** `POST /plans`,
`GET /plans`, `GET /plans/{id}`, `GET /plans/{id}/usage`, `DELETE /plans/{id}`.

## Key response shapes

```jsonc
// GET /balance
{ "balance_cents", "balance_formatted", "total_spent_cents",
  "total_spent_formatted", "allocations": { "<product>": null|{} } }

// GET /usage/summary
{ "time_range": {start,end,period}, "summary": {total_bytes,total_gb,total_requests,active_plans},
  "by_product": { "<product>": {bytes,plans} }, "daily_breakdown": [{date,bytes,gb}] }

// GET /usage/realtime
{ active_plans, active_connections, bytes_last_5min, requests_last_5min,
  bytes_per_second, requests_per_second, timestamp }

// POST /plans -> data
{ plan_id, product, billing_type, proxy_username, proxy_password,
  connection: { hostname, port_http, port_socks, format },
  limits: { max_gb, max_bytes, max_mbps, bytes_used },
  expires_at, status, billing: { mode, price_per_gb, gb_purchased,
  cost_cents, cost_formatted, balance_before, balance_after },
  created_at, allowed_ips, end_user_reference }

// GET /plans/{id}/usage
{ plan_id, bytes_used, gb_used, max_bytes, max_gb,
  percentage_used (string), expires_at, days_remaining }
```

## Metrics — IMPORTANT

`/plans/{id}/metrics/*` is **only supported for `datacenter`, `shared_isp`,
`ipv6_residential`, `ipv6_datacenter`**. Other products return
`400 METRICS_NOT_SUPPORTED`. The UI must branch on product and show a friendly
"metrics not available for this product" state.

All metrics take `?hours=` (1–168, default 24); series are bucketed to ~60
points (`bucket_minutes` returned). Shapes confirmed against a live datacenter
plan (traffic was auth-rejected, so byte-based series stayed empty, but
envelopes + connection/error/latency/destination items are real):

```jsonc
// summary
{ hours, total_bytes, total_mb, total_up_bytes, total_down_bytes, up_mb, down_mb,
  total_connections, total_successes, total_errors, success_rate_pct (null when 0 conns),
  peak_concurrent, avg_mbps, peak_mbps, burst_mbps, samples }

// throughput   -> { hours, bucket_minutes, series: [{ bucket, mbps, peak_mbps, burst_mbps, rate_cap_mbps, samples }] }
// latency      -> { hours, bucket_minutes, series: [{ bucket, p50, p95, p99 }] }   // ms
// errors       -> { hours, bucket_minutes, series: [{ bucket, dns, tcp, tls, timeout, auth,
//                   upstream_4xx, upstream_5xx, zero_byte, proxy_internal, client_disconnect,
//                   socks5_protocol, bad_request, conn_limit, bandwidth_quota, blacklisted, upstream_select }] }
// status-codes -> { hours, bucket_minutes, series: [{ bucket, s2xx, s3xx, s4xx, s5xx }] }  // plain-HTTP only
// destinations -> { hours, destinations: [{ destination, connections, successes, errors, mb_received, mb_sent, p95_ms }] }
// hourly-usage -> { hours, total_gb, hourly: [{ ...GB per wall-clock hour }] }
// error-messages -> { hours, messages: [{ error_type, message, count }] }  // hostnames scrubbed to [redacted]
```

## Spend log (real money)

| When | Action | Cost |
|------|--------|------|
| 2026-06-14 | Live `residential-lite` 1GB (learned: no metrics) | $0.21 |
| 2026-06-14 | Live `datacenter` 1GB (captured metric shapes) | $0.18 |
| **Total** | | **$0.39** (balance $49.61) |

Both plans were created and cancelled within the same script run; no refunds on cancel.

## Open question (not blocking)

Datacenter proxy auth rejected our test requests (`auth` error category). Likely
needs source-IP allowlisting or username targeting suffixes — worth confirming
later, but not needed to build the dashboard.
