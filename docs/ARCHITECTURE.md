# WP SEO Bulk Updater — Technical Architecture & Roadmap

A complete engineering reference: how the system is built, how data flows through it end-to-end, what's deliberate vs. what's tech debt, and a categorized improvement roadmap.

---

## 1. System Overview

A multi-tenant MERN service that bulk-updates WordPress meta titles and descriptions across client sites running Yoast SEO, Rank Math, or All In One SEO. One CSV in, one report out, with full audit trail and rollback.

The architectural bet is that **WordPress is just a REST API**. Everything that previously required a human to log into WP Admin and click around is reduced to authenticated HTTP calls to `/wp-json/wp/v2/...` from a Node.js orchestrator.

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         OPERATOR'S BROWSER                                 │
│                     React + Vite + Tailwind dashboard                      │
│                          (localhost:5173)                                  │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │ /api/* (proxied by Vite in dev)
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          NODE.JS BACKEND                                   │
│                  Express + Mongoose + JWT + crypto                         │
│                          (localhost:5000)                                  │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Auth         │  │ Site         │  │ Job          │  │ Audit        │    │
│  │ Controller   │  │ Controller   │  │ Controller   │  │ Controller   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                 │                 │           │
│         ▼                  ▼                 ▼                 ▼           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                          SERVICE LAYER                             │    │
│  │  cryptoService · wpClient · pluginDetector · urlResolver           │    │
│  │  metaWriter · csvParser · bulkRunner                               │    │
│  └─────────────────┬──────────────────────────────────┬───────────────┘    │
└────────────────────┼──────────────────────────────────┼────────────────────┘
                     │                                  │
                     ▼                                  ▼
        ┌────────────────────────┐         ┌────────────────────────────┐
        │   MongoDB Atlas        │         │   Client WordPress site    │
        │   - users              │◀────────│   /wp-json/wp/v2/posts     │
        │   - sites (encrypted)  │         │   /wp-json/wp/v2/users/me  │
        │   - jobs (with rows)   │         │                            │
        │   - auditlogs          │         │   + bridge mu-plugin       │
        └────────────────────────┘         └────────────────────────────┘
```

The dashboard never talks to WordPress directly. Every WP call goes through the Node backend, where credentials live encrypted at rest.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React 18 + Vite 5 | Fastest dev loop, no SSR overhead needed for an internal tool |
| Styling | Tailwind 3 | Zero design system overhead, consistent spacing |
| Routing | React Router 6 | Standard, declarative |
| Frontend state | React Context (auth only) | This app has no complex client state — Context is enough; Redux/Zustand would be overkill |
| HTTP client | axios with interceptors | Auto JWT injection + auto-401 redirect |
| Backend framework | Express 4 | Boring, stable, well-known |
| ORM | Mongoose 8 | Schema validation, hooks for password hashing |
| Database | MongoDB Atlas (M0 free tier) | Document model fits the embedded `rows[]` shape of jobs perfectly; managed |
| Auth | JWT (jsonwebtoken) | Stateless, simple, no session store needed |
| Password hashing | bcryptjs | Standard for user passwords |
| Secret encryption | Node `crypto` AES-256-GCM | Built-in, authenticated encryption with integrity check |
| HTTP to WordPress | axios per-site instance | Pre-auth headers, base URL pinning |
| Concurrency control | p-limit | Tiny, focused, exactly what we need |
| CSV parsing | papaparse | Battle-tested, handles edge cases |
| File upload | multer (memory storage) | Files are small, no need for disk staging |
| Security headers | helmet | Standard CSP/XSS hardening |
| Rate limiting | express-rate-limit | Currently only on `/api/auth/*` |
| WordPress bridge | Custom 90-line PHP plugin | Registers SEO meta keys with `show_in_rest = true` |

---

## 4. Component Breakdown

### 4.1 Frontend (React)

```
client/src/
├── api/axios.js              # Auth interceptor + auto-401 redirect
├── context/AuthContext.jsx   # Login/register/logout state
├── components/Layout.jsx     # Sidebar shell
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx         # Stats cards + recent jobs
│   ├── Sites.jsx             # List + redetect + delete
│   ├── SiteForm.jsx          # Add/edit (auto-detect on save)
│   ├── BulkUpdate.jsx        # CSV upload entry point
│   ├── JobDetail.jsx         # Preview, run, live progress, report, rollback
│   └── AuditLogs.jsx         # Searchable history
├── App.jsx                   # PrivateRoute + route definitions
└── main.jsx                  # AuthProvider + BrowserRouter
```

Key design choices:

- **No global state library.** Auth lives in Context, everything else is page-local. The app is small enough that prop drilling doesn't hurt.
- **JWT in localStorage.** Simple but vulnerable to XSS. Production should move this to an httpOnly cookie (see roadmap).
- **2-second polling on JobDetail** while a job is running. Cheap and reliable, but should be replaced by WebSockets at scale.
- **Tailwind + zero custom CSS.** Consistency without a design system to maintain.

### 4.2 Backend (Express)

```
server/src/
├── config/
│   ├── env.js                # dotenv + sanity checks
│   └── db.js                 # mongoose connection
├── models/
│   ├── User.js               # bcrypt pre-save hook
│   ├── Site.js               # toJSON strips appPasswordEncrypted
│   ├── Job.js                # embedded rows[] subdoc
│   └── AuditLog.js           # indexed on site + createdAt
├── middleware/
│   ├── auth.js               # JWT verification, attaches req.user
│   ├── errorHandler.js       # central error response
│   └── upload.js             # multer memory storage, 5 MB cap
├── services/
│   ├── cryptoService.js      # AES-256-GCM encrypt/decrypt
│   ├── wpClient.js           # axios per-site factory + testConnection
│   ├── pluginDetector.js     # 3-tier auto-detection
│   ├── urlResolver.js        # slug → post ID across post types
│   ├── metaWriter.js         # universal field map + read/write
│   ├── csvParser.js          # papaparse with column validation
│   └── bulkRunner.js         # p-limit orchestration + audit + rollback
├── controllers/
│   ├── authController.js
│   ├── siteController.js
│   ├── jobController.js
│   └── auditController.js
├── routes/
│   ├── auth.js
│   ├── sites.js
│   ├── jobs.js
│   └── audit.js
├── app.js                    # express setup, middleware chain, route mounting
└── server.js                 # bootstrap + db connect + listen
```

Architectural conventions:

- **Controllers are thin.** They validate input, call services, handle responses. No business logic.
- **Services are pure orchestration.** They take primitive inputs, return data, throw on errors. Easy to unit test (when we add tests).
- **Models do almost nothing beyond schema definition.** Pre-save hooks only for things that must always happen (password hashing).
- **No DI container.** Modules are imported directly. The app is small enough that this is fine.

### 4.3 WordPress Bridge Plugin

A 90-line PHP file at `wp-plugin/seo-bulk-updater-bridge/seo-bulk-updater-bridge.php`. Two responsibilities:

1. **Register meta keys with `show_in_rest = true`** for every public post type. Without this, custom meta is hidden from the REST API and our writes silently no-op.
2. **Optional AIOSEO 4+ bridge** via `register_rest_field('aioseo', ...)` because AIOSEO 4+ stores its data in a separate custom DB table (`wp_aioseo_posts`), not post meta.

The plugin has no UI, no settings, no database tables of its own, no scheduled tasks. It's a passive enabler — the entire point is that clients install it once and never think about it again.

---

## 5. Data Models

### User
```js
{
  _id, email (unique), password (bcrypt),
  name, role: 'admin' | 'operator',
  createdAt, updatedAt
}
```

### Site
```js
{
  _id, name, siteUrl, username,
  appPasswordEncrypted,        // base64(IV + tag + ciphertext) — AES-256-GCM
  detectedPlugin: 'yoast' | 'rankmath' | 'aioseo' | 'generic' | 'unknown',
  lastDetectedAt,
  notes,
  createdBy: ObjectId(User),
  createdAt, updatedAt
}
```

`toJSON()` strips `appPasswordEncrypted` so it never leaks to API responses.

### Job
```js
{
  _id,
  site: ObjectId(Site),
  createdBy: ObjectId(User),
  status: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled',
  pluginUsed: String,            // snapshot at run time
  totalRows, successCount, failedCount,
  rows: [{                       // embedded subdoc — atomic with the job
    postUrl, newTitle, newDescription,
    resolvedPostId, resolvedPostType,
    oldTitle, oldDescription,    // captured before write — used for rollback
    status: 'pending' | 'success' | 'failed' | 'skipped',
    error,
    processedAt
  }],
  startedAt, completedAt,
  createdAt, updatedAt
}
```

The decision to embed `rows[]` inside the Job is deliberate: rows are always read together with the job, never queried independently, and a job rarely has more than a few thousand rows (well within Mongo's 16 MB document limit).

### AuditLog
```js
{
  _id,
  site: ObjectId(Site),
  job: ObjectId(Job),
  postId, postType, postUrl, plugin,
  field: 'title' | 'description' | 'both',
  oldValue, newValue,
  action: 'update' | 'rollback',
  performedBy: ObjectId(User),
  createdAt
}
```

One audit row per field per change, so a single bulk job creates `2 × rowCount` audit entries. Indexed on `(site, createdAt desc)` for the audit log page.

---

## 6. End-to-End Flow

### 6.1 Onboarding a client site

```
Operator                        Backend                          WordPress
   │                               │                                │
   │ POST /api/sites               │                                │
   │ { name, siteUrl, username,    │                                │
   │   appPassword, notes }        │                                │
   ├──────────────────────────────▶│                                │
   │                               │ testConnection(...)            │
   │                               ├───────────────────────────────▶│
   │                               │  GET /wp-json/wp/v2/users/me   │
   │                               │◀───────────────────────────────┤
   │                               │  200 OK { id, name }           │
   │                               │                                │
   │                               │ detectSEOPlugin(...)           │
   │                               ├───────────────────────────────▶│
   │                               │  GET /wp-json (namespaces)     │
   │                               │◀───────────────────────────────┤
   │                               │  → { "yoast/v1", ... }         │
   │                               │                                │
   │                               │ encrypt(appPassword) →          │
   │                               │ AES-256-GCM(iv|tag|ct) → b64   │
   │                               │                                │
   │                               │ Site.create({ ..., plugin })   │
   │ ◀─────────────────────────────┤                                │
   │ 201 Created { site }          │                                │
```

Three guarantees from this flow:

1. **No bad credentials get stored.** If the test connection fails, we 400 with the actual WP error message. The Site is never persisted.
2. **Plugin detection is recorded once and cached.** Subsequent jobs use this cached value. The operator can hit "Redetect" if plugins change later.
3. **Plaintext password never touches the database.** It exists only in memory during the request, gets encrypted, and the plaintext is dropped.

### 6.2 Uploading a CSV

```
Operator                        Backend
   │                               │
   │ POST /api/jobs/upload         │
   │ FormData { siteId, file }     │
   ├──────────────────────────────▶│
   │                               │ multer parses multipart
   │                               │ csvParser.parseMetaCsv(buffer)
   │                               │   → validates required cols
   │                               │   → trims, normalizes
   │                               │   → returns rows[]
   │                               │
   │                               │ Job.create({
   │                               │   site, status: 'draft',
   │                               │   rows: [{ ..., status: 'pending' }],
   │                               │   totalRows
   │                               │ })
   │ ◀─────────────────────────────┤
   │ 201 { _id, status: 'draft' }  │
```

The job sits in `draft` state. The operator can preview rows on JobDetail, edit any of them inline (`PUT /api/jobs/:id/rows`), and then click Run. The "draft" state exists specifically so an operator can catch errors before pushing to a real WordPress site.

### 6.3 Running a bulk job

```
Operator                        Backend                              WordPress + Mongo
   │                               │                                       │
   │ POST /api/jobs/:id/run        │                                       │
   ├──────────────────────────────▶│                                       │
   │ ◀─────────────────────────────┤                                       │
   │ 200 { ok: true } (immediate)  │                                       │
   │                               │ runBulkJob(jobId, userId)             │
   │                               │   ─ fire and forget ─                 │
   │                               │                                       │
   │                               │ job.status = 'running'                │
   │                               │ job.startedAt = now                   │
   │                               │ job.save()                            │
   │                               │                                       │
   │                               │ wp = createWpClient(site)             │
   │                               │   ↳ decrypt(appPasswordEncrypted)     │
   │                               │   ↳ axios.create({ baseURL, auth })   │
   │                               │                                       │
   │                               │ pLimit(3) over job.rows.map(row =>    │
   │                               │                                       │
   │                               │  ┌─ for each row, in parallel (max 3):
   │                               │  │                                    │
   │                               │  │ resolvePostFromUrl(wp, postUrl)    │
   │                               │  │   for type in [posts, pages, prod] │
   │                               │  │     GET /wp-json/wp/v2/{type}      │
   │                               │  │       ?slug=... &context=edit ────▶│
   │                               │  │     ◀───────────────────────────── │
   │                               │  │                                    │
   │                               │  │ readPostMeta(wp, type, id, plugin) │
   │                               │  │   GET /wp-json/wp/v2/{type}/{id}   │
   │                               │  │     ?context=edit ────────────────▶│
   │                               │  │   ◀──────────────────────────────  │
   │                               │  │   ← { title, description }         │
   │                               │  │     (saved as oldTitle/oldDesc)    │
   │                               │  │                                    │
   │                               │  │ writePostMeta(wp, type, id, plugin,│
   │                               │  │   { title, description })          │
   │                               │  │   POST /wp-json/wp/v2/{type}/{id}  │
   │                               │  │     { meta: { _yoast_wpseo_*: ... }
   │                               │  │   ────────────────────────────────▶│
   │                               │  │   ◀──────────────────────────────  │
   │                               │  │                                    │
   │                               │  │ row.status = 'success'             │
   │                               │  │ row.resolvedPostId = id            │
   │                               │  │                                    │
   │                               │  │ AuditLog.insertMany([              │
   │                               │  │   { field: 'title', old, new },    │
   │                               │  │   { field: 'description', old, new}│
   │                               │  │ ]) ───────────────────────────────▶│
   │                               │  │                                    │
   │                               │  │ delay(200ms)                       │
   │                               │  └──                                  │
   │                               │                                       │
   │                               │ job.status = 'completed'              │
   │                               │ job.successCount, failedCount         │
   │                               │ job.completedAt = now                 │
   │                               │ job.save()                            │
   │                                                                       │
   │ ─── meanwhile on the frontend ───                                     │
   │                                                                       │
   │ JobDetail polls GET /api/jobs/:id every 2 seconds                     │
   │ → progress bar updates as rows flip from pending → success            │
```

Key details:

- **Fire-and-forget execution.** The HTTP request returns immediately with 200 — the runner mutates the job document in the background. This is fine for a single-replica server. The moment we add multiple replicas (or restarts mid-job), we need a real queue (Bull/BullMQ).
- **Failures are isolated per row.** A single 404 or auth error on one row marks just that row as failed; the rest of the job continues. This is critical for client trust — partial success > total failure.
- **The `oldTitle` / `oldDescription` snapshot is the rollback safety net.** Without it, rollback would be a destructive guess. With it, rollback is a deterministic re-write.

### 6.4 Rollback

```
Operator                        Backend                              WordPress + Mongo
   │                               │                                       │
   │ POST /api/jobs/:id/rollback   │                                       │
   ├──────────────────────────────▶│                                       │
   │                               │ rollbackJob(jobId, userId)            │
   │                               │                                       │
   │                               │ rows = job.rows.filter(r =>           │
   │                               │   r.status === 'success' &&           │
   │                               │   r.resolvedPostId)                   │
   │                               │                                       │
   │                               │ pLimit(3) over rows:                  │
   │                               │   writePostMeta(wp, type, id, plugin, │
   │                               │     { title: row.oldTitle,            │
   │                               │       description: row.oldDescription }
   │                               │   ) ─────────────────────────────────▶│
   │                               │                                       │
   │                               │   AuditLog.create({                   │
   │                               │     action: 'rollback',               │
   │                               │     oldValue: '<new>', newValue: '<old>'
   │                               │   }) ────────────────────────────────▶│
   │                               │                                       │
   │ ◀─────────────────────────────┤                                       │
   │ 200 { rolledBack: N }         │                                       │
```

Rollback is symmetric to the forward run — same `writePostMeta` call, just with the captured old values. The audit log records it as `action: 'rollback'` so the history is honest about what happened.

### 6.5 CSV format

Required columns (case-insensitive, spaces allowed in headers):

```
post_url,meta_title,meta_description
https://clientsite.com/best-shoes/,"Best Running Shoes 2025","Reviewed 50..."
```

Parser (`csvParser.js`) is intentionally strict:

- UTF-8 BOM stripped on read
- Headers normalized to lowercase, spaces to underscores
- Required columns checked, throws with explicit message if missing
- Empty rows skipped (`skipEmptyLines: 'greedy'`)
- Throws on zero data rows

The strictness prevents the operator from accidentally uploading a sheet from the wrong column order — the most common real-world bug.

---

## 7. Security Model

### What's protected
- **WordPress Application Passwords** — encrypted at rest with AES-256-GCM, never logged, never returned in API responses (`Site.toJSON()` strips them), decrypted in memory only for the duration of a request.
- **Dashboard user passwords** — bcrypt hashed (cost factor 10).
- **JWT** — signed with `JWT_SECRET` from `.env`, 7-day expiry by default.
- **CORS** — restricted to `CLIENT_ORIGIN` from `.env`.
- **Rate limiting** — 50 requests / 15 min on `/api/auth/*` to slow brute-force.
- **Helmet headers** — CSP, X-Frame-Options, X-Content-Type-Options, etc.
- **CSV file upload** — 5 MB cap, mimetype + extension check.

### What's intentionally not protected (for now, with rationale)
- **No CSRF tokens.** JWT is sent via `Authorization` header, not cookies, so CSRF doesn't apply.
- **No request signing.** This is an internal tool, not a public API.
- **No 2FA.** Single-user / small-team tool. Add this when you have client-facing operators.
- **No audit log on read operations.** Only writes are audited. Adding read audits is cheap if needed.

### Known weaknesses

1. **JWT in localStorage** — vulnerable to XSS. An attacker who lands JS on your dashboard can grab the token. Mitigation: move to httpOnly cookies (see roadmap section 9.1).
2. **`ENCRYPTION_KEY` in `.env`** — if the server is compromised, all stored app passwords are decryptable. Mitigation: KMS / Vault for production (section 9.3).
3. **No key rotation strategy.** Changing `ENCRYPTION_KEY` invalidates every stored Site password. Production needs a key versioning scheme.
4. **Mongoose `findOne` filters by `createdBy`** — multi-tenancy is enforced at the controller layer. There's no DB-level RLS. A bug in a controller could leak data across users.
5. **No request body size limit beyond 10 MB JSON / 5 MB CSV.** Add `express.urlencoded` limit if you accept form posts later.

---

## 8. Known Limitations / Tech Debt

### 8.1 Functional gaps
- **AIOSEO 4+ support is scaffolded but not battle-tested.** The bridge plugin's `register_rest_field` for AIOSEO assumes the helper class is available; behavior on edge AIOSEO versions is unverified.
- **`product` post type assumed for WooCommerce.** Custom post types other than `posts/pages/product` aren't auto-resolved. Workaround: pre-resolve URLs to IDs externally and pass via a different code path (not built).
- **No URL → post ID for non-pretty-permalinks.** If a site uses `?p=123` URLs, the slug extraction returns `?p=123` and resolution fails. Real-world incidence is near zero on modern sites.
- **No scheduled jobs.** A bulk job runs on POST, never on a schedule. No "rerun every Monday at 9am" feature.

### 8.2 Operational gaps
- **No tests.** Zero. The test pyramid is empty.
- **No CI/CD.** Manual deploy only. Should at least add GitHub Actions for lint + test on push.
- **No structured logging.** `console.log` everywhere. Pino or Winston with JSON output is standard.
- **No metrics.** No request counts, no job durations, no error rates exposed.
- **No health-deeper endpoint.** `/api/health` only confirms the process is alive, not that Mongo is reachable.

### 8.3 Code smells
- **`runBulkJob` is fire-and-forget.** A server restart mid-job leaves the job in `running` state forever. There's no recovery loop on startup.
- **Embedded `rows[]` in Job document.** Fine up to ~5,000 rows per job, breaks at ~50,000+ due to Mongo's 16 MB doc limit. Need to switch to a separate `JobRow` collection at scale.
- **No pagination on `/api/audit`.** Returns all records up to a hard limit of 1000. Need cursor-based pagination.
- **No pagination on `/api/jobs`.** Same issue.
- **JobDetail polls every 2 seconds unconditionally** while running. Inefficient at scale; switch to WebSockets.
- **Plugin detection runs three sequential probes.** Could be parallelized; currently slow on bad networks.

---

## 9. Improvement Roadmap

Categorized by effort and impact. The roadmap is opinionated — these are improvements I'd actually ship in this order.

### 9.1 Quick wins (1–2 days each)

| # | Improvement | Why |
|---|---|---|
| 1 | **Move JWT to httpOnly cookie** | Eliminates XSS-stealing attack vector |
| 2 | **Add cursor pagination to `/api/audit` + `/api/jobs`** | Currently won't scale past ~1000 entries |
| 3 | **Replace JobDetail polling with Socket.io** | Real-time progress, no wasted requests, better UX |
| 4 | **Bulk template fills** (e.g. `{post_title} \| {site_name}`) | Operators repeat this pattern in every CSV — automate it |
| 5 | **Per-row "skip" toggle in JobDetail draft view** | Currently you have to delete a row to skip it |
| 6 | **CSV download for the audit log** | Operators want to share with clients |
| 7 | **Site connection re-test button on Sites page** | Currently only retest happens on save |
| 8 | **`/api/health/deep` that checks Mongo too** | Actual health check, not just process liveness |
| 9 | **Structured logging with pino** | Necessary before any prod deploy |
| 10 | **Replace `console.log` of errors with `logger.error`** | Same |

### 9.2 Medium effort (1 week each)

| # | Improvement | Why |
|---|---|---|
| 1 | **Bull / BullMQ + Redis job queue** | Survives server restarts, retries on failure, multi-replica safe |
| 2 | **Startup recovery: jobs in `running` state get marked `failed` or resumed** | Pairs with #1 |
| 3 | **AI title suggestion via Claude API** | Per-row "Suggest" button that calls Anthropic's API to draft meta from post content |
| 4 | **Multi-user / role-based access** | Owner / Editor / Viewer roles, scoped per site |
| 5 | **Per-site CSV format presets** | Some clients use weird URL patterns; let operators configure a per-site URL transform |
| 6 | **Vitest + supertest for backend** | Unit tests for services, integration tests for routes |
| 7 | **Playwright for frontend smoke tests** | One happy-path test per page |
| 8 | **GitHub Actions: lint + test + build on push** | Standard CI |
| 9 | **Deployment to Railway / Render / Fly** | Move from `npm run dev` to actual hosted dev environment |
| 10 | **Custom post type registration** | Let operators register additional post types per site |

### 9.3 Major (multi-week)

| # | Improvement | Why |
|---|---|---|
| 1 | **Move `appPasswordEncrypted` from raw AES to AWS KMS / GCP KMS / HashiCorp Vault** | Eliminates the single-key compromise risk |
| 2 | **Key versioning + rotation** | When `ENCRYPTION_KEY` rotates, re-encrypt all Site passwords transparently |
| 3 | **Job templates / scheduling** | Recurring bulk updates ("re-apply this template every Monday") |
| 4 | **Externalize `rows[]` to a separate collection** | Required to support >50k row jobs |
| 5 | **Multi-tenant billing layer** | Stripe + per-org workspaces if you turn this into SaaS |
| 6 | **Webhook system** | Clients can subscribe to "job completed" events |
| 7 | **Two-factor auth for dashboard users** | Required if you take on operators outside your own team |
| 8 | **Audit log retention policy + cold storage** | Won't be cheap once you have millions of audit rows |
| 9 | **Integration with the existing services from your other planned features** (alt tag automation, content scraping pipeline) | Unify into a single dashboard |
| 10 | **Public REST API for the dashboard itself** | If clients want to push CSVs from their own systems |

### 9.4 Architectural pivots to consider later

- **WebSocket-first instead of REST.** Once Socket.io is in for progress, more of the dashboard could use it. Probably overkill for this app.
- **Move the bulk runner out of Node.** A worker in Go or Rust would handle 10x the throughput, but Node is fine until you're updating millions of posts a day.
- **Replace Mongoose with raw MongoDB driver.** Faster, less abstraction. Worth it only if Mongoose becomes a bottleneck — almost never does for this kind of app.
- **Move from MongoDB to Postgres.** Document model fits jobs well, so this is a step backwards unless you need joins for reporting.
- **Edge-deployed dashboard (Vercel / Cloudflare Pages).** Frontend static, API on a Node host. Standard split.

---

## 10. Scaling Considerations

### Where the system breaks first

| Pressure point | Breaks at | Fix |
|---|---|---|
| Concurrent jobs on a single server | ~10 simultaneous bulk runs | Move to BullMQ + Redis |
| Rows per job | ~5,000 (Mongo doc soft limit at 16 MB) | Externalize `rows[]` to a separate collection |
| Audit log size | ~1 million rows (M0 free tier limit) | Upgrade Atlas tier + cold storage |
| WP REST API rate limits | Varies per host (~10 req/s typical) | Already mitigated by `p-limit(3)` + 200ms cooldown; tunable per site |
| Operator concurrent users | ~50 (single-replica Express) | Horizontal scale with sticky-session-free JWT — already there |
| MongoDB connection pool | M0 = 100 max connections | Upgrade tier or use connection pooling proxy |

### When to actually start scaling

Don't scale prematurely. The architecture is fine for:
- **Up to ~50 client sites**
- **Up to ~10 jobs per day**
- **Up to ~5,000 rows per job**
- **Single operator (you)**

That's enough headroom to onboard 10-20 paying clients before you need to touch any of section 9.3.

---

## 11. Testing Strategy (To Build)

There are zero tests today. Here's the priority order I'd add them in:

### 11.1 Service-layer unit tests (highest ROI)

These services are pure functions and trivial to test:

- `cryptoService.encrypt/decrypt` — round-trip + tamper detection (changing one byte should throw)
- `metaWriter.getMetaFields` — every plugin returns the right keys
- `urlResolver.extractSlug` — handles trailing slashes, query strings, hash fragments
- `csvParser.parseMetaCsv` — column variations, BOM, empty rows, missing required columns

Tool: **Vitest** (faster than Jest, ESM-native).

### 11.2 Integration tests for routes

Spin up a test Mongo instance (mongodb-memory-server), use **supertest** against the Express app:

- Auth flow (register → login → /me)
- Site CRUD with mocked WP backend
- Job upload → run → status → report
- Audit log filtering

### 11.3 Frontend smoke tests

**Playwright** with one happy-path test per page:

- Login → Dashboard
- Sites → Add Site (with mocked API)
- Bulk Update → Upload CSV → JobDetail → Run

Skip unit tests on React components. The components are thin and Playwright catches the things that matter.

### 11.4 What NOT to test

- React component snapshots (low value, high churn)
- Mongoose model definitions (testing the framework, not your code)
- The bridge PHP plugin (tested implicitly by integration tests against a real WP)

---

## 12. Deployment Plan (When You're Ready)

### Recommended initial setup (~$5/month)

| Component | Service | Why |
|---|---|---|
| Node API | Railway / Render | Free tier, auto-deploy from GitHub on push |
| MongoDB | Atlas M0 | Already there |
| React frontend | Vercel / Cloudflare Pages | Free, fast, edge-cached |
| Domain | Cloudflare DNS | Free + DDoS protection |

### Pre-deploy checklist

- [ ] Generate fresh `JWT_SECRET` and `ENCRYPTION_KEY` for prod (don't reuse dev)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CLIENT_ORIGIN` to your real frontend domain
- [ ] Restrict Atlas IP whitelist to the prod server's outbound IP (no more `0.0.0.0/0`)
- [ ] Set up MongoDB backups in Atlas (M2+)
- [ ] Add `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers
- [ ] Enable HTTPS only (Cloudflare flexible SSL is fine to start)
- [ ] Move JWT from localStorage to httpOnly cookie (see 9.1)
- [ ] Add Sentry or similar error tracking
- [ ] Verify the bridge plugin works on prod WP versions you target (6.x)
- [ ] Document the `.env` requirements for the next person

### Deploy day workflow

1. Push to `main` → CI runs tests → green
2. Railway auto-deploys backend
3. Vercel auto-deploys frontend
4. Smoke test: register a fresh user, add a test site, run a 1-row dry job
5. Roll back via Railway / Vercel UI if anything's wrong

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Bridge plugin** | The 90-line WordPress plugin that exposes SEO meta fields to the REST API |
| **Application Password** | WordPress's official API auth mechanism (built-in since WP 5.6) |
| **Plugin auto-detection** | The 3-tier strategy that figures out whether a site uses Yoast, RankMath, or AIOSEO |
| **Universal field map** | The lookup table in `metaWriter.js` that converts our generic `{ title, description }` into the right meta key for each plugin |
| **Dry run** | A small bulk job (1–5 rows) used to verify wiring before committing to a full job |
| **Rollback** | Re-applying the captured `oldTitle` / `oldDescription` from a previous job |
| **Audit log** | Append-only history of every meta change with old + new values |
| **Operator** | The dashboard user (you) running bulk updates |
| **Client** | The owner of the WordPress site being updated |

---

## 14. References

- **WordPress REST API:** https://developer.wordpress.org/rest-api/
- **WP Application Passwords:** https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/
- **Yoast SEO meta fields:** stored in `wp_postmeta` under keys `_yoast_wpseo_*`
- **Rank Math meta fields:** stored in `wp_postmeta` under keys `rank_math_*`
- **AIOSEO 4+ schema:** `wp_aioseo_posts` custom table — *not* `wp_postmeta`
- **p-limit:** https://github.com/sindresorhus/p-limit
- **Mongoose docs:** https://mongoosejs.com/
- **Helmet:** https://helmetjs.github.io/
