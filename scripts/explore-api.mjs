#!/usr/bin/env node
/**
 * FlashProxy API exploration script.
 *
 * Hits read-only (GET) endpoints and prints the REAL response shapes so we can
 * design the dashboard around actual data, not guesses.
 *
 * Safety:
 *  - Reads the API key from the FLASHPROXY_API_KEY env var. Never hardcoded.
 *  - Defaults to the SANDBOX base URL so it costs no real money.
 *  - Only performs GET requests. It never creates/cancels/extends a plan.
 *
 * Usage (PowerShell):
 *   $env:FLASHPROXY_API_KEY="sk_..."; node scripts/explore-api.mjs
 *   $env:FLASHPROXY_API_KEY="sk_..."; node scripts/explore-api.mjs --live
 *
 * Usage (bash):
 *   FLASHPROXY_API_KEY=sk_... node scripts/explore-api.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SANDBOX = "https://rapi.flashproxy.com/sandbox/api/v1";
const LIVE = "https://rapi.flashproxy.com/api/v1";

const useLive = process.argv.includes("--live");
const BASE = useLive ? LIVE : SANDBOX;

const API_KEY = process.env.FLASHPROXY_API_KEY;
if (!API_KEY) {
  console.error("ERROR: set FLASHPROXY_API_KEY in your environment first.");
  console.error('  PowerShell: $env:FLASHPROXY_API_KEY="sk_..."');
  process.exit(1);
}

const OUT_DIR = `${__dirname}/../.api-samples`;
const results = {};

/** Call one endpoint, print a summary, and stash the JSON. */
async function hit(method, path, { label } = {}) {
  const url = `${BASE}${path}`;
  const name = label || `${method} ${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    results[`${method} ${path}`] = { status: res.status, body };

    const ok = res.ok ? "OK " : "ERR";
    console.log(`\n[${ok} ${res.status}] ${name}`);
    console.log(preview(body));
    return body;
  } catch (err) {
    console.log(`\n[FAIL] ${name} -> ${err.message}`);
    results[`${method} ${path}`] = { error: err.message };
    return null;
  }
}

/** Compact, readable preview of a JSON body (trims long arrays). */
function preview(body) {
  const seen = JSON.stringify(
    body,
    (key, value) => {
      if (Array.isArray(value) && value.length > 3) {
        return [...value.slice(0, 3), `…(+${value.length - 3} more)`];
      }
      return value;
    },
    2
  );
  return seen.length > 2500 ? seen.slice(0, 2500) + "\n  …(truncated)" : seen;
}

async function main() {
  console.log(`Base URL: ${BASE}  ${useLive ? "(LIVE — real money!)" : "(sandbox)"}`);

  // --- Account-level (no plan id needed) ---
  await hit("GET", "/balance");
  await hit("GET", "/balance/transactions");
  await hit("GET", "/balance/pricing");
  await hit("GET", "/usage/summary");
  await hit("GET", "/usage/realtime");
  await hit("GET", "/proxies/stock");
  await hit("GET", "/proxies/pools");
  await hit("GET", "/geo/catalog");
  await hit("GET", "/sub-users");

  // --- Plans, then drill into the first plan for plan-scoped endpoints ---
  const plansBody = await hit("GET", "/plans");
  const plans = plansBody?.data?.plans || plansBody?.data || [];
  const firstId = Array.isArray(plans) && plans[0] ? plans[0].id || plans[0].planId : null;

  if (firstId) {
    console.log(`\n--- Drilling into plan: ${firstId} ---`);
    await hit("GET", `/plans/${firstId}`);
    await hit("GET", `/plans/${firstId}/usage`);
    await hit("GET", `/plans/${firstId}/metrics/summary`);
    await hit("GET", `/plans/${firstId}/metrics/throughput`);
    await hit("GET", `/plans/${firstId}/metrics/latency`);
    await hit("GET", `/plans/${firstId}/metrics/errors`);
    await hit("GET", `/plans/${firstId}/metrics/status-codes`);
    await hit("GET", `/plans/${firstId}/metrics/destinations`);
    await hit("GET", `/plans/${firstId}/metrics/hourly-usage`);
  } else {
    console.log("\n(No plans found — skipping plan-scoped endpoints.)");
  }

  await mkdir(OUT_DIR, { recursive: true });
  const outFile = `${OUT_DIR}/${useLive ? "live" : "sandbox"}-samples.json`;
  await writeFile(outFile, JSON.stringify(results, null, 2));
  console.log(`\nFull responses written to ${outFile}`);
}

main();
