#!/usr/bin/env node
/**
 * Provision a LIVE ipv6-residential plan (metrics-supported, ~$0.09/GB), confirm
 * the proxy authenticates, drive REAL successful traffic, and LEAVE IT ACTIVE.
 *
 * ipv6-residential is a user:pass gateway (like residential-lite, which worked),
 * so no IP allowlist / targeting suffix is needed.
 *
 * Guard: --confirm-live-spend.  Usage:
 *   node --env-file=.env scripts/provision-ipv6-demo.mjs --confirm-live-spend
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { platform } from "node:os";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://rapi.flashproxy.com/api/v1";
const NULL_DEV = platform() === "win32" ? "NUL" : "/dev/null";

if (!process.argv.includes("--confirm-live-spend")) {
  console.error("Refusing to run: spends real money. Add --confirm-live-spend");
  process.exit(1);
}
const API_KEY = process.env.FLASHPROXY_API_KEY;
if (!API_KEY) { console.error("Set FLASHPROXY_API_KEY"); process.exit(1); }

const results = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
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
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  results[`${method} ${path}`] = { status: res.status, body: parsed };
  console.log(`[${res.ok ? "OK " : "ERR"} ${res.status}] ${method} ${path}`);
  return parsed;
}

/** One request through the proxy; returns the HTTP status code as a string. */
async function probe(proxy, url) {
  const { stdout } = await execFileAsync("curl", [
    "-s", "-o", NULL_DEV, "-w", "%{http_code}", "--max-time", "40", "-x", proxy, url,
  ]);
  return stdout.trim();
}

async function main() {
  const created = await api("POST", "/plans", {
    product: "ipv6-residential",
    billing_type: "bandwidth",
    bandwidth_gb: 1,
    end_user_reference: "demo-active-metrics",
  });
  const plan = created?.data;
  const planId = plan?.plan_id;
  if (!planId) { console.log("No plan id:", JSON.stringify(created)); await save(); return; }
  console.log(`\nPlan ${planId} (product=${plan.product}) cost ${plan?.billing?.cost_formatted}`);
  console.log(`Proxy: ${plan.connection.format}`);

  const proxy = `http://${plan.proxy_username}:${plan.proxy_password}@${plan.connection.hostname}:${plan.connection.port_http}`;

  // Pre-flight: confirm auth works before sending bulk traffic.
  console.log("\nPre-flight auth check…");
  const code = await probe(proxy, "http://httpbin.org/get");
  console.log(`  http://httpbin.org/get -> ${code}`);
  if (code !== "200") {
    console.log(`Auth not working (got ${code}). Plan ${planId} is created/active but skipping bulk traffic.`);
    await save();
    return;
  }

  // Drive real traffic: plain HTTP (for status-codes) + a few MB (for throughput).
  const targets = [
    "http://httpbin.org/bytes/1000000",
    "http://httpbin.org/get",
    "http://httpbin.org/status/200",
    "http://httpbin.org/status/404",
    "http://httpbin.org/bytes/1000000",
    "https://api.ipify.org",
  ];
  console.log("Driving traffic…");
  let ok = 0;
  for (let i = 0; i < 18; i++) {
    const c = await probe(proxy, targets[i % targets.length]);
    if (c.startsWith("2") || c.startsWith("4")) ok++;
    process.stdout.write(c === "200" ? "." : `(${c})`);
  }
  console.log(`\n${ok}/18 requests reached upstream.`);

  console.log("Waiting 90s for metrics to aggregate…");
  await sleep(90000);

  await api("GET", `/plans/${planId}/usage`);
  for (const m of ["summary", "throughput", "status-codes", "destinations", "errors", "latency", "hourly-usage"]) {
    const r = await api("GET", `/plans/${planId}/metrics/${m}?hours=24`);
    console.log("   " + JSON.stringify(r?.data).slice(0, 260));
  }

  console.log(`\n✅ Plan ${planId} is ACTIVE (not cancelled). Open it in the dashboard.`);
  await save();
}

async function save() {
  await mkdir(`${__dirname}/../.api-samples`, { recursive: true });
  await writeFile(`${__dirname}/../.api-samples/live-demo-metrics.json`, JSON.stringify(results, null, 2));
  console.log("Saved .api-samples/live-demo-metrics.json");
}

main();
