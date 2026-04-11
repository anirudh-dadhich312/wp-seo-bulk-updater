# WP SEO Bulk Updater

A multi-tenant MERN dashboard that bulk-updates WordPress meta titles and descriptions across client sites — regardless of whether they use **Yoast**, **Rank Math**, or **All In One SEO**.

```
Client sends CSV  →  You upload to dashboard  →  System auto-detects plugin
                  →  Resolves URLs to post IDs →  Pushes to correct meta fields
                  →  Stores audit log         →  One-click rollback
```

---

## Project Layout

```
wp-seo-bulk-updater/
├── server/                       # Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── config/               # env, db
│   │   ├── models/               # User, Site, Job, AuditLog
│   │   ├── services/             # wpClient, pluginDetector, urlResolver,
│   │   │                         # metaWriter, csvParser, bulkRunner, cryptoService
│   │   ├── controllers/          # auth, sites, jobs, audit
│   │   ├── routes/               # /api/auth, /api/sites, /api/jobs, /api/audit
│   │   ├── middleware/           # auth (JWT), upload (multer), errorHandler
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── client/                       # React + Vite + Tailwind dashboard
│   ├── src/
│   │   ├── api/axios.js          # Auth-aware API client
│   │   ├── context/AuthContext.jsx
│   │   ├── components/Layout.jsx
│   │   ├── pages/                # Login, Register, Dashboard, Sites,
│   │   │                         # SiteForm, BulkUpdate, JobDetail, AuditLogs
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
├── wp-plugin/
│   └── seo-bulk-updater-bridge/  # Tiny WP plugin to expose meta in REST API
│       ├── seo-bulk-updater-bridge.php
│       └── readme.txt
│
└── samples/
    └── sample-meta.csv           # Example CSV format
```

---

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, ENCRYPTION_KEY (must be 32 chars)
npm install
npm run dev
```

The API will run on `http://localhost:5000`.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

The dashboard will run on `http://localhost:5173` and proxy `/api/*` to the backend.

### 3. WordPress side (per client, one-time)

1. Zip the `wp-plugin/seo-bulk-updater-bridge/` folder.
2. In the client's WP Admin → **Plugins → Add New → Upload Plugin** → upload the zip.
3. Activate it.
4. Generate an **Application Password**: WP Admin → **Users → Profile → Application Passwords** → name it "SEO Bulk Updater" → copy the generated password.
5. Hand the **site URL + username + Application Password** to your dashboard.

You never touch the client's codebase. The mu-plugin only registers meta fields with `show_in_rest = true` and adds an AIOSEO 4+ virtual field.

---

## How it works

### Adding a client site

`POST /api/sites` does three things in sequence before saving:

1. **Test connection** — calls `/wp-json/wp/v2/users/me` with the credentials to verify they work.
2. **Auto-detect SEO plugin** — probes `/wp-json` namespaces, then `/wp-json/wp/v2/plugins`, then sniffs the homepage HTML as a last resort. Returns one of `yoast | rankmath | aioseo | generic`.
3. **Encrypt + persist** — the application password is encrypted with **AES-256-GCM** before being stored in MongoDB. It is never logged.

### Running a bulk job

1. **Upload CSV** (`POST /api/jobs/upload`) — server parses the CSV via PapaParse, validates required columns, and stores a `Job` document in `draft` state with all rows pending.
2. **Preview + edit** (`GET /api/jobs/:id`, `PUT /api/jobs/:id/rows`) — operator can edit any row inline before running.
3. **Run** (`POST /api/jobs/:id/run`) — fire-and-forget execution. The `bulkRunner` service:
   - Spins up a `p-limit(3)` queue (3 concurrent WP requests).
   - For each row: resolves URL → post id, reads existing meta, writes new meta via the correct plugin field key, logs an `AuditLog` entry, sleeps 200 ms.
   - Updates the job document in real time so the React UI can poll progress.
4. **Report** (`GET /api/jobs/:id/report`) — downloads a CSV with success/failure status per row.
5. **Rollback** (`POST /api/jobs/:id/rollback`) — re-applies the stored old values to every successfully updated post.

### The universal meta writer

A single field map handles all three plugins:

| Plugin   | Title key                | Description key             |
|----------|--------------------------|-----------------------------|
| Yoast    | `_yoast_wpseo_title`     | `_yoast_wpseo_metadesc`     |
| RankMath | `rank_math_title`        | `rank_math_description`     |
| AIOSEO   | `_aioseo_title`          | `_aioseo_description`       |
| Generic  | `_seo_title`             | `_seo_description`          |

The bridge mu-plugin registers all of these as REST-exposed post meta, so the same `POST /wp-json/wp/v2/posts/{id}` request works for any plugin — only the field key changes.

---

## CSV format

```
post_url,meta_title,meta_description
https://clientsite.com/best-shoes/,"Best Running Shoes 2025","We reviewed 50 running shoes..."
https://clientsite.com/headphones/,"Top 10 Headphones","Our expert picks..."
```

Required columns (case-insensitive, spaces allowed):
- `post_url` — full URL to the post/page/product
- `meta_title` — new SEO meta title
- `meta_description` — new SEO meta description

See [samples/sample-meta.csv](samples/sample-meta.csv).

---

## API Reference

| Method | Endpoint                       | Purpose                              |
|--------|--------------------------------|--------------------------------------|
| POST   | `/api/auth/register`           | Create a dashboard user              |
| POST   | `/api/auth/login`              | Get JWT                              |
| GET    | `/api/auth/me`                 | Current user                         |
| GET    | `/api/sites`                   | List your client sites               |
| POST   | `/api/sites`                   | Add site (tests + detects plugin)    |
| PUT    | `/api/sites/:id`               | Update site                          |
| DELETE | `/api/sites/:id`               | Remove site                          |
| POST   | `/api/sites/:id/redetect`      | Re-run plugin auto-detection         |
| POST   | `/api/jobs/upload`             | Upload CSV → create draft job        |
| GET    | `/api/jobs`                    | List jobs                            |
| GET    | `/api/jobs/:id`                | Get job with rows                    |
| PUT    | `/api/jobs/:id/rows`           | Edit draft job rows                  |
| POST   | `/api/jobs/:id/run`            | Start bulk update (fire-and-forget)  |
| POST   | `/api/jobs/:id/rollback`       | Roll back successful rows            |
| GET    | `/api/jobs/:id/report`         | Download per-row CSV report          |
| GET    | `/api/audit?siteId=&jobId=`    | View audit log                       |

All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

---

## Security

- **Application passwords** are encrypted at rest with AES-256-GCM. The encryption key lives in `.env` and never touches the database.
- **Dashboard auth** uses JWT (httpOnly storage on the client is recommended for production — current scaffold uses `localStorage` for simplicity).
- **Rate limiting** is enabled on `/api/auth/*` (50 req / 15 min).
- **CORS** is restricted to the client origin from `.env`.
- **Helmet** sets safe security headers.

---

## Production checklist

- [ ] Replace `JWT_SECRET` and `ENCRYPTION_KEY` with random 32+ char values.
- [ ] Use a managed MongoDB (Atlas, etc.) — never expose Mongo to the public.
- [ ] Move JWT to httpOnly cookie (currently localStorage).
- [ ] Add a job queue (Bull + Redis) once you have >100 concurrent rows or want background workers.
- [ ] Wire up Socket.io for live progress instead of 2-second polling.
- [ ] Add per-user role-based access control if multiple operators share a dashboard.
- [ ] Run the dashboard behind HTTPS (Cloudflare / nginx / Caddy).
