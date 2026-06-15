#!/usr/bin/env node
/**
 * Drive sustained real traffic through the active metrics-capable plan so the
 * dashboard shows live data (realtime activity, usage, and metrics charts).
 *
 * Reads the plan from the API (no hardcoded creds). Uses the residential gateway
 * username suffix (-country-us) required for auth. Costs only bandwidth from the
 * already-purchased plan (a few MB).
 *
 * Usage: node --env-file=.env scripts/drive-traffic.mjs [--seconds=240]
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { platform } from "node:os";

const execFileAsync = promisify(execFile);
const BASE = "https://rapi.flashproxy.com/api/v1";
const NULL_DEV = platform() === "win32" ? "NUL" : "/dev/null";
const API_KEY = process.env.FLASHPROXY_API_KEY;
if (!API_KEY) { console.error("Set FLASHPROXY_API_KEY"); process.exit(1); }

const secondsArg = process.argv.find((a) => a.startsWith("--seconds="));
const DURATION = (secondsArg ? Number(secondsArg.split("=")[1]) : 240) * 1000;

const TARGETS = [
  "http://neverssl.com",
  "http://speedtest.tele2.net/100KB.zip",
  "http://httpbin.org/ip",
  "http://speedtest.tele2.net/100KB.zip",
];

async function getActivePlan() {
  const res = await fetch(`${BASE}/plans`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
  });
  const body = await res.json();
  const plans = body?.data?.plans ?? [];
  // Prefer an active residential/ipv6 gateway plan (those authenticate).
  return (
    plans.find(
      (p) =>
        p.status === "active" &&
        /ipv6.residential|residential|mobile/.test(p.product),
    ) || plans.find((p) => p.status === "active")
  );
}

async function main() {
  const plan = await getActivePlan();
  if (!plan) { console.error("No active plan found"); process.exit(1); }
  const user = `${plan.proxy_username}-country-us`;
  const proxy = `http://${user}:${plan.proxy_password}@${plan.connection.hostname}:${plan.connection.port_http}`;
  console.log(`Driving traffic via ${plan.product} (${plan.plan_id.slice(0, 8)}) for ${DURATION / 1000}s…`);

  const end = Date.now() + DURATION;
  let sent = 0, ok = 0;
  let i = 0;
  while (Date.now() < end) {
    const url = TARGETS[i++ % TARGETS.length];
    try {
      const { stdout } = await execFileAsync("curl", [
        "-s", "-o", NULL_DEV, "-w", "%{http_code}", "--max-time", "20", "-x", proxy, url,
      ]);
      sent++;
      if (stdout.trim().startsWith("2")) ok++;
    } catch {
      sent++;
    }
    if (sent % 10 === 0) {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      console.log(`  sent ${sent}, ${ok} ok (${left}s left)`);
    }
  }
  console.log(`Done. ${ok}/${sent} successful.`);
}

main();
