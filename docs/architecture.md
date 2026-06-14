# Architecture & Design Decisions

A short note on how the dashboard is put together and why. Read
`docs/api-findings.md` first for the upstream API contract.

## The shape of the problem

Resellers log in with their FlashProxy API key and need to understand their
account: balance, plans, usage, and per-plan performance metrics. We also need
our own backend in the middle so we can see **who uses the dashboard and what
they do**, with an audit log of logins and actions.

Two hard constraints drive the design:

1. **The API key is a bearer credential to real money.** It must never reach the
   browser, never be logged, and never be committed.
2. **We need durable, queryable audit data** — that means a database.

## High-level shape: Backend-for-Frontend (BFF)

```
Browser ──▶ Next.js Route Handlers (/api/*) ──▶ FlashProxy API
                      │
                      ├──▶ iron-session (encrypted httpOnly cookie)
                      └──▶ Supabase Postgres (Prisma) — resellers + audit log
```

The browser never talks to FlashProxy directly. Every upstream call goes through
our Route Handlers, which:

- read the API key from the encrypted session (never from the client),
- call FlashProxy server-side,
- write an audit-log row,
- return only the data the UI needs.

This is the standard BFF pattern and it's the only way to keep the key server-side
while still letting a public dashboard use it.

## Auth & session

- **Login**: user pastes their API key. The backend validates it by calling
  `GET /balance`. If it succeeds, the key is real.
- **Identity without storing the key**: we compute `keyHash = sha256(key)` and
  use that as the stable reseller id. The raw key is **never** stored in the DB.
- **Session**: the raw key is kept only inside an **`iron-session`** cookie —
  AES-encrypted, httpOnly, sameSite=lax, secure in production. The server
  decrypts it per request to call FlashProxy. No server-side session store needed
  for the key itself.
- **Logout**: destroys the cookie. Audited.

Why not Supabase Auth / OAuth? Resellers don't have accounts with *us* — their
identity *is* their FlashProxy key. Layering a second identity system would add
friction for no benefit in this slice.

## Access control

A reseller can only ever see their own data, because every upstream call uses
*their* key from *their* session. There is no cross-tenant data path. Admin/audit
visibility is a separate concern (see below).

## Audit logging

Every meaningful event is written to `AuditLog` in Postgres:

- `login_success`, `login_failure`, `logout`
- data reads (`view_balance`, `view_plans`, `view_plan`, `view_metrics`, …)

Each row records: reseller (by hash), event, HTTP method/path, upstream status,
client IP, user-agent, and a small JSON metadata blob. Logging is best-effort and
never blocks the user response. This gives the "who is using the dashboard and
what they do" visibility the brief asks for, queryable with plain SQL.

## Database: Supabase Postgres via Prisma

Postgres (managed by Supabase) over SQLite because the app is meant to deploy to
serverless (e.g. Vercel), where a local SQLite file is ephemeral and the audit
log would not survive redeploys. Prisma gives type-safe queries and versioned
migrations. Runtime uses Supabase's pooled connection (`DATABASE_URL`);
migrations use the direct connection (`DIRECT_URL`).

Schema (see `prisma/schema.prisma`):

- **Reseller** — `keyHash` (unique), optional label (last 4 of key for display),
  first/last seen timestamps, last-seen balance snapshot.
- **AuditLog** — reseller relation, event, method, path, status, ip, userAgent,
  metadata (JSON), createdAt; indexed by `(resellerId, createdAt)`.

## Tech choices

- **Next.js (App Router) + TypeScript** — required stack.
- **Tailwind CSS v4** — styling. No component library; plain Tailwind for full
  control and minimal dependencies.
- **Recharts** — metrics time-series charts.
- **TanStack Query** — client-side caching/refetch of live data.
- **Zod** — validate env and request inputs at the boundary.
- **iron-session** — encrypted cookie sessions.

## What this slice deliberately focuses on

The "understand my account" read path done well: secure login, balance, plans,
usage, and product-gated metrics — with a real audit trail behind it. Mutations
(create/extend/cancel plans) are intentionally out of scope for the first slice
to avoid spending real money and to keep the security surface small. See the
README "What I'd do next" for the roadmap.
