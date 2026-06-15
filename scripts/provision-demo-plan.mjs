#!/usr/bin/env node
/**
 * Provision a LIVE datacenter plan, whitelist our public IP, drive real traffic,
 * and LEAVE IT ACTIVE so the dashboard shows real metrics. SPENDS REAL MONEY (~$0.18).
 *
 * Datacenter/ISP proxies authenticate by source IP (not the user:pass gateway
 * that residential uses), so we set allowed_ips to our public IP — otherwise
 * every request is rejected as an `auth` error (what happened in earlier tests).
 *
 * Guard: requires --confirm-live-spend.
 * Usage: node --env-file=.env scripts/provision-demo-plan.mjs --confirm-live-spend
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://rapi.flashproxy.com/api/v1";

if (!process.argv.includes("--confirm-live-spend")) {
  console.error("Refusing to run: spends real money. Add --confirm-live-spend");
  process.exit(1);
}
const API_KEY = process.env.FLASHPROXY_API_KEY;
if (!API_KEY) {
  console.error("Set FLASHPROXY_API_KEY (node --env-file=.env ...)");
  process.exit(1);
}

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
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  results[`${method} ${path}`] = { status: res.status, body: parsed };
  console.log(`[${res.ok ? "OK " : "ERR"} ${res.status}] ${method} ${path}`);
  return parsed;
}

async function main() {
  // 1. Public IP (the proxy must whitelist the IP traffic comes from).
  const ipRes = await fetch("https://api.ipify.org?format=json");
  const { ip } = await ipRes.json();
  console.log(`Public IP: ${ip}`);

  // 2. Create a datacenter plan with our IP allowlisted.
  const created = await api("POST", "/plans", {
    product: "datacenter",
    billing_type: "bandwidth",
    bandwidth_gb: 1,
    allowed_ips: [ip],
    end_user_reference: "demo-active-metrics",
  });
  const plan = created?.data;
  const planId = plan?.plan_id;
  if (!planId) {
    console.log("No plan id; aborting.", JSON.stringify(created));
    await save();
    return;
  }
  console.log(`\nPlan ${planId} created. cost: ${plan?.billing?.cost_formatted}`);
  console.log(`Proxy: ${plan.connection.format}`);

  // 3. Drive real traffic (plain HTTP so status-codes populate; a few MB for throughput).
  const proxy = `http://${plan.proxy_username}:${plan.proxy_password}@${plan.connection.hostname}:${plan.connection.port_http}`;
  const targets = [
    "http://httpbin.org/bytes/1000000",
    "http://httpbin.org/get",
    "http://httpbin.org/status/200",
    "http://httpbin.org/bytes/1000000",
    "http://httpbin.org/status/404",
    "http://httpbin.org/get",
    "http://httpbin.org/bytes/1000000",
    "https://api.ipify.org",
  ];
  console.log("\nDriving traffic…");
  let ok = 0;
  for (let i = 0; i < 16; i++) {
    const url = targets[i % targets.length];
    try {
      await execFileAsync("curl", ["-s", "-o", "/dev/null", "--max-time", "40", "-x", proxy, url]);
      ok++;
      process.stdout.write(".");
    } catch (e) {
      process.stdout.write(`x(${e.code})`);
    }
  }
  console.log(`\n${ok}/16 requests completed without curl error.`);

  // 4. Let the 1-minute aggregation flush, then read metrics.
  console.log("Waiting 90s for metrics to aggregate…");
  await sleep(90000);

  await api("GET", `/plans/${planId}/usage`);
  for (const m of ["summary", "throughput", "status-codes", "destinations", "errors", "latency"]) {
    const r = await api("GET", `/plans/${planId}/metrics/${m}?hours=24`);
    console.log("   " + JSON.stringify(r?.data).slice(0, 240));
  }

  console.log(`\n✅ Plan ${planId} is ACTIVE and NOT cancelled. View it in the dashboard.`);
  await save();
}

async function save() {
  await mkdir(`${__dirname}/../.api-samples`, { recursive: true });
  await writeFile(`${__dirname}/../.api-samples/live-demo-metrics.json`, JSON.stringify(results, null, 2));
  console.log("Saved .api-samples/live-demo-metrics.json");
}

main();
