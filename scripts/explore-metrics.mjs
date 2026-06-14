#!/usr/bin/env node
/**
 * Explore plan-scoped + metrics endpoints by creating a throwaway plan.
 *
 * The metrics endpoints have no documented response schema in the OpenAPI spec,
 * so the only way to learn their shape is to call them against a real plan.
 *
 * Safety:
 *  - SANDBOX ONLY. The base URL is hardcoded to the sandbox and the script
 *    refuses to run against live. Sandbox uses fake money ($100k balance).
 *  - Creates one cheap residential-lite plan, reads everything, then cancels it.
 *
 * Usage (PowerShell):
 *   node --env-file=.env scripts/explore-metrics.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://rapi.flashproxy.com/sandbox/api/v1"; // sandbox only — fake money

const API_KEY = process.env.FLASHPROXY_API_KEY;
if (!API_KEY) {
  console.error('ERROR: set FLASHPROXY_API_KEY first (node --env-file=.env ...).');
  process.exit(1);
}

const results = {};

async function call(method, path, { body } = {}) {
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
  results[`${method} ${path}`] = { status: res.status, body: parsed };
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
  return s.length > 2000 ? s.slice(0, 2000) + "\n  …(truncated)" : s;
}

async function main() {
  console.log(`Base URL: ${BASE} (sandbox — fake money)`);

  // 1. Create a cheap throwaway plan.
  const created = await call("POST", "/plans", {
    body: { product: "residential-lite", bandwidth_gb: 1, end_user_reference: "explore-script" },
  });
  const plan = created?.data?.plan || created?.data;
  const planId = plan?.plan_id || plan?.id || plan?.planId;

  if (!planId) {
    console.log("\nCould not create/identify a plan — aborting metrics exploration.");
  } else {
    console.log(`\n--- Created plan ${planId}; exploring plan-scoped endpoints ---`);
    await call("GET", `/plans/${planId}`);
    await call("GET", `/plans/${planId}/usage`);
    await call("GET", `/plans/${planId}/metrics/summary`);
    await call("GET", `/plans/${planId}/metrics/throughput?hours=24`);
    await call("GET", `/plans/${planId}/metrics/latency?hours=24`);
    await call("GET", `/plans/${planId}/metrics/errors?hours=24`);
    await call("GET", `/plans/${planId}/metrics/status-codes?hours=24`);
    await call("GET", `/plans/${planId}/metrics/destinations`);
    await call("GET", `/plans/${planId}/metrics/hourly-usage`);
    await call("GET", `/plans/${planId}/metrics/error-messages`);

    // 2. Clean up — cancel the throwaway plan.
    console.log(`\n--- Cleaning up: cancelling plan ${planId} ---`);
    await call("DELETE", `/plans/${planId}`);
  }

  // Bonus: the two endpoints that needed query params.
  await call("GET", "/proxies/stock?product_type=residential");
  await call("GET", "/geo/catalog?product=pool1");

  await mkdir(`${__dirname}/../.api-samples`, { recursive: true });
  await writeFile(
    `${__dirname}/../.api-samples/sandbox-metrics.json`,
    JSON.stringify(results, null, 2)
  );
  console.log("\nFull responses written to .api-samples/sandbox-metrics.json");
}

main();
