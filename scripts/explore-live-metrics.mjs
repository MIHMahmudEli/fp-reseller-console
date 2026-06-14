#!/usr/bin/env node
/**
 * LIVE metrics exploration — SPENDS REAL MONEY (~$0.21).
 *
 * The /metrics/* endpoints 404 in sandbox and have no schema in the OpenAPI
 * spec, so the only way to learn their real response shapes is to hit them
 * against a live plan. This script:
 *   1. Creates a 1GB residential-lite plan on LIVE  (~$0.21)
 *   2. Captures every plan-scoped + metrics endpoint (pass 1)
 *   3. If metrics look empty/shapeless, routes a little traffic through the
 *      proxy creds, waits, and re-captures (pass 2)
 *   4. Cancels the plan and reports the exact cost
 *
 * Guard: refuses to run unless you pass --confirm-live-spend.
 *
 * Usage (PowerShell):
 *   node --env-file=.env scripts/explore-live-metrics.mjs --confirm-live-spend
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://rapi.flashproxy.com/api/v1"; // LIVE

if (!process.argv.includes("--confirm-live-spend")) {
  console.error("Refusing to run: this spends real money.");
  console.error("Re-run with:  node --env-file=.env scripts/explore-live-metrics.mjs --confirm-live-spend");
  process.exit(1);
}

const API_KEY = process.env.FLASHPROXY_API_KEY;
if (!API_KEY) {
  console.error("ERROR: set FLASHPROXY_API_KEY first (node --env-file=.env ...).");
  process.exit(1);
}

const results = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const METRIC_PATHS = (id) => [
  `/plans/${id}/metrics/summary`,
  `/plans/${id}/metrics/throughput?hours=24`,
  `/plans/${id}/metrics/latency?hours=24`,
  `/plans/${id}/metrics/errors?hours=24`,
  `/plans/${id}/metrics/status-codes?hours=24`,
  `/plans/${id}/metrics/destinations`,
  `/plans/${id}/metrics/hourly-usage`,
  `/plans/${id}/metrics/error-messages`,
];

async function call(method, path, { body, bucket } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  (bucket || results)[`${method} ${path}`] = { status: res.status, body: parsed };
  const tag = res.ok ? "OK " : "ERR";
  console.log(`\n[${tag} ${res.status}] ${method} ${path}`);
  console.log(preview(parsed));
  return parsed;
}

function preview(body) {
  const s = JSON.stringify(
    body,
    (k, v) => (Array.isArray(v) && v.length > 4 ? [...v.slice(0, 4), `…(+${v.length - 4})`] : v),
    2
  );
  return s.length > 2200 ? s.slice(0, 2200) + "\n  …(truncated)" : s;
}

/** Heuristic: does a metrics response actually contain data points? */
function looksEmpty(passBucket) {
  const vals = Object.values(passBucket);
  const ok = vals.filter((v) => v.status >= 200 && v.status < 300);
  if (ok.length === 0) return true;
  // empty if no OK response carries a non-empty array anywhere in its body
  const hasPoints = ok.some((v) => JSON.stringify(v.body).match(/\[\s*\{/));
  return !hasPoints;
}

/** Send a little traffic through the proxy creds to populate metrics. */
async function generateTraffic(conn) {
  const proxy = `http://${conn.proxy_username}:${conn.proxy_password}@${conn.connection.hostname}:${conn.connection.port_http}`;
  console.log(`\n--- Generating a little traffic via ${conn.connection.hostname}:${conn.connection.port_http} ---`);
  // Mix of plain-HTTP (so status-codes metric populates) and HTTPS, plus a few
  // larger downloads so throughput/hourly-usage register meaningful bytes.
  const targets = [
    "http://httpbin.org/get",
    "http://httpbin.org/bytes/500000",
    "https://httpbin.org/bytes/500000",
    "http://httpbin.org/status/404",
    "https://api.ipify.org?format=json",
    "http://httpbin.org/get",
  ];
  for (let i = 0; i < 12; i++) {
    const url = targets[i % targets.length];
    try {
      await execFileAsync("curl", ["-s", "-o", "/dev/null", "--max-time", "30", "-x", proxy, url]);
      console.log(`  request ${i + 1} -> ${url} ok`);
    } catch (e) {
      console.log(`  request ${i + 1} -> ${url} (exit ${e.code ?? "?"})`);
    }
  }
}

async function captureMetrics(id, label) {
  console.log(`\n===== METRICS PASS: ${label} =====`);
  const bucket = {};
  for (const p of METRIC_PATHS(id)) await call("GET", p, { bucket });
  results[`metrics_${label}`] = bucket;
  return bucket;
}

async function main() {
  console.log(`Base URL: ${BASE} (LIVE — real money)`);

  const balBefore = await call("GET", "/balance");

  // datacenter is the cheapest product that supports /metrics/* (per the spec:
  // datacenter, shared_isp, ipv6_residential, ipv6_datacenter). ~$0.18/GB.
  const created = await call("POST", "/plans", {
    body: { product: "datacenter", billing_type: "bandwidth", bandwidth_gb: 1, end_user_reference: "explore-live-metrics" },
  });
  const plan = created?.data;
  const planId = plan?.plan_id || plan?.id;

  if (!planId) {
    console.log("\nCould not create/identify a plan — aborting.");
    await save();
    return;
  }

  try {
    await call("GET", `/plans/${planId}`);
    await call("GET", `/plans/${planId}/usage`);

    await captureMetrics(planId, "pass1_no_traffic");

    if (plan?.connection && plan?.proxy_username) {
      await generateTraffic(plan);
      console.log("\nWaiting 90s for the 1-minute aggregation pipeline to flush...");
      await sleep(90000);
      await call("GET", `/plans/${planId}/usage`);
      await captureMetrics(planId, "pass2_after_traffic");
    }
  } finally {
    console.log(`\n--- Cleaning up: cancelling plan ${planId} ---`);
    await call("DELETE", `/plans/${planId}`);
    const balAfter = await call("GET", "/balance");
    const spent =
      (balBefore?.data?.balance_cents ?? 0) - (balAfter?.data?.balance_cents ?? 0);
    console.log(`\n>>> SPENT: ${spent} cents (~$${(spent / 100).toFixed(2)})`);
    results.spend_cents = spent;
  }

  await save();
}

async function save() {
  await mkdir(`${__dirname}/../.api-samples`, { recursive: true });
  await writeFile(`${__dirname}/../.api-samples/live-metrics.json`, JSON.stringify(results, null, 2));
  console.log("\nFull responses written to .api-samples/live-metrics.json");
}

main();
