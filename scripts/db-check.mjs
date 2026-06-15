#!/usr/bin/env node
/**
 * Quick DB sanity check: counts resellers and prints recent audit events.
 * Usage: node --env-file=.env scripts/db-check.mjs
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const resellers = await prisma.reseller.findMany({
  select: { id: true, label: true, lastBalanceCents: true, firstSeenAt: true },
});
const audits = await prisma.auditLog.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  select: { event: true, method: true, path: true, status: true, ip: true, createdAt: true },
});

console.log("resellers:", resellers);
console.log("recent audit events:");
for (const a of audits) {
  console.log(`  ${a.createdAt.toISOString()}  ${a.event}  ${a.method ?? ""} ${a.path ?? ""} -> ${a.status ?? ""}`);
}

await prisma.$disconnect();
