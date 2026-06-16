# FlashProxy Reseller Console

A public reseller dashboard built on top of the [FlashProxy Reseller API](https://rapi.flashproxy.com/docs).
Resellers log in with their API key and get a clear view of their **balance, plans,
usage, and per-plan performance metrics** — with a small backend in the middle
that keeps the key server-side and records an **audit log of every login and action**.

> Take-home task. Built with TypeScript + Next.js. The repo is public; no secrets
> are committed (the API key lives only in environment variables / an encrypted
> session cookie).

## What I built

- **API-key login** — the key is validated against the live API, then stored only
  in an AES-encrypted, http-only **session cookie**. It never reaches the browser
  and is never written to the database.
- **Overview** — live activity (auto-refreshing), balance, and 24h usage with a
  daily chart and per-product breakdown.
- **Plans** — list with usage/status, and a detail page with copy-to-clipboard
  connection details (password reveal) and live usage.
- **Performance metrics** — throughput, latency (p50/p95/p99), upstream status
  codes, errors-by-category, and top destinations, over a selectable window.
  Product-gated: only `datacenter`, `shared_isp`, `ipv6_*` collect metrics, so
  other products show a friendly "not available" state instead of an error.
- **Billing** — balance, transactions, and your pricing.
- **Admin audit viewer** (`/admin`) — operator-only view of who is using the
  dashboard and what they do: resellers + a filterable activity feed.

A short note on architecture and the API exploration that informed it:

- [`docs/architecture.md`](docs/architecture.md) — design decisions (BFF, auth, audit, DB)
- [`docs/api-findings.md`](docs/api-findings.md) — what the live API actually returns
- [`docs/api.json`](docs/api.json) — the upstream OpenAPI spec

## Architecture

```
Browser ──▶ Next.js Route Handlers (/api/*) ──▶ FlashProxy API
                      │
                      ├──▶ iron-session (encrypted http-only cookie holds the key)
                      └──▶ Supabase Postgres via Prisma (resellers + audit log)
```

The browser only ever calls our own `/api/*` routes. Each route reads the key
from the session, calls FlashProxy server-side, writes an audit row, and returns
just what the UI needs. This is the standard Backend-for-Frontend pattern and is
what keeps the credential off the client.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Recharts · TanStack Query ·
Prisma 7 + Supabase Postgres · iron-session · Zod.

## Running locally

**Prerequisites:** Node 20+ and a Postgres database (a free Supabase project works).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from the template and fill it in:

   ```bash
   cp .env.example .env
   ```

   | Variable | What it is |
   |----------|------------|
   | `SESSION_SECRET` | 32+ char random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `DATABASE_URL` | Supabase **pooled** connection (port 6543, `?pgbouncer=true`) |
   | `DIRECT_URL` | Supabase **direct** connection (port 5432) — used for migrations |
   | `ADMIN_TOKEN` | Password for the `/admin` audit viewer (optional; admin disabled if unset) |
   | `FLASHPROXY_API_BASE_URL` | Defaults to live; use the sandbox URL for safe dev |

   > If your DB password contains URL-special characters (`@ / ? # % ...`),
   > percent-encode it in the connection strings.

3. Apply the database schema:

   ```bash
   npx prisma migrate deploy   # or: npx prisma migrate dev
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and log in with a reseller API key.
   The audit viewer is at http://localhost:3000/admin.

## Deploy (Vercel)

The app is serverless-friendly (Supabase pooled connection + Prisma driver
adapter). To deploy:

1. Push to GitHub and **import the repo** at [vercel.com/new](https://vercel.com/new).
   Next.js is auto-detected; no custom build settings needed (`prisma generate`
   runs via the `postinstall` script).
2. Add the same **environment variables** as `.env` in the Vercel project
   settings: `SESSION_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `ADMIN_TOKEN`,
   `FLASHPROXY_API_BASE_URL`.
3. The database schema is managed with Prisma migrations — run
   `npx prisma migrate deploy` against the production DB once (locally with the
   prod `DIRECT_URL`, or as a one-off), since Vercel doesn't migrate on deploy.
4. Deploy. The login page is the entry point; `/admin` is the operator view.

## API exploration scripts

The `scripts/` folder holds the read-only probes used to learn the API before
building (see `docs/api-findings.md`). They read `FLASHPROXY_API_KEY` from `.env`:

```bash
node --env-file=.env scripts/explore-api.mjs          # account endpoints (sandbox)
node --env-file=.env scripts/explore-api.mjs --live   # against the live account
node --env-file=.env scripts/db-check.mjs             # resellers + recent audit rows
```

## Notes on the $50 test balance

Spending was deliberate and small — **$0.66 total** (balance **$49.34**):

| Action | Cost | Why |
|--------|------|-----|
| Live `residential-lite` 1GB (cancelled) | $0.21 | Discovered metrics are product-gated |
| Live `datacenter` 1GB (cancelled) | $0.18 | Captured the real `/metrics/*` response shapes |
| Live `datacenter` 1GB (active) | $0.18 | Demo plan — but the datacenter gateway wouldn't authenticate our creds |
| Live `ipv6-residential` 1GB (active) | $0.09 | Demo plan with **real successful traffic + populated metrics** |

Two plans are kept **active** so the dashboard shows live metrics. To populate
the metrics, real traffic was driven through the proxy — note the gateway
username needs a targeting suffix (e.g. `username-country-us:password@host`),
discovered via `GET /proxies/connection-info`.

The dashboard itself is **read-only** against the API — it never creates or
cancels plans, so running it costs nothing. Plan provisioning was done only via
the one-off `scripts/provision-*.mjs` helpers.

