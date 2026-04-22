# Deployment Guide: Testing Phase (Vercel + Railway/Render)

This guide walks you through deploying the WP SEO Bulk Updater to production for the **testing phase**.

**Architecture:**
- **Frontend:** Vercel or Netlify (static build)
- **Backend:** Railway or Render (Node.js)
- **Database:** MongoDB Atlas (free M0 tier, already in use)

---

## Part 1: Backend Deployment (Railway)

Railway is the easiest option — it's GitHub-connected, free tier is generous, and auto-deploys on push.

### 1.1 Create MongoDB Atlas Database

If you don't have one already:

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free, create a project
3. Create a **free M0 cluster**
4. Create a database user (e.g., `seo-bulk-updater`)
5. Get your connection string: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
6. Save it — you'll paste this into Railway

### 1.2 Deploy to Railway

1. **Go to https://railway.app** and sign up with GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Select your `wp-seo-bulk-updater` repository
4. Railway detects `server/` as a service
5. Click to configure:
   - **Service name:** `wp-seo-bulk-updater-api`
   - **Root directory:** `server`
6. **Add Variables** (click "Add Variable"):
   - `MONGO_URI`: paste your MongoDB Atlas connection string
   - `JWT_SECRET`: generate a random 32+ char string (use `openssl rand -base64 32` in terminal)
   - `ENCRYPTION_KEY`: generate a random 32-char string (use `head -c 32 /dev/urandom | base64`)
   - `NODE_ENV`: `production`
   - `CLIENT_ORIGIN`: (leave blank for now, update after frontend deployed)
   - `PORT`: `10000` (Railway assigns this automatically, but good to be explicit)

7. **Deploy** button → watch the build log

Once deployed, you'll get a URL like `https://wp-seo-bulk-updater-api-prod-abc123.up.railway.app`.

**Save this URL** — you'll use it in the next step.

---

## Part 2: Frontend Deployment (Vercel)

### 2.1 Deploy to Vercel

1. **Go to https://vercel.com** and sign up with GitHub
2. **Add New Project** → **Import Git Repository**
3. Select your `wp-seo-bulk-updater` repo
4. **Configure:**
   - **Framework Preset:** React (Vite)
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. **Environment Variables:**
   - `VITE_API_URL`: paste your Railway backend URL (e.g., `https://wp-seo-bulk-updater-api-prod-abc123.up.railway.app`)

6. **Deploy** → Vercel builds and hosts it

Once deployed, you get a URL like `https://wp-seo-bulk-updater.vercel.app`.

**Save this URL** — you need it for the next step.

### 2.2 Update Backend's CLIENT_ORIGIN

Go back to **Railway → your project → Variables**:

- Change `CLIENT_ORIGIN` to your Vercel URL (e.g., `https://wp-seo-bulk-updater.vercel.app`)

Railway redeploys automatically with the new CORS origin.

---

## Part 3: Test the Live Setup

1. **Open your Vercel frontend URL** in the browser
2. **Register** a new user (or use an existing one if you already tested locally)
3. **Add a client site:**
   - Site URL: any WordPress site
   - Username: WordPress username
   - App Password: the password generated in WP Admin
4. **Upload a CSV** and run a test job on 1 row (dry run)
5. **Check the response** — if it succeeds, everything is wired correctly

---

## Part 4: Troubleshooting

### "CORS error when calling API"
- Check that `CLIENT_ORIGIN` on Railway matches your Vercel URL exactly (including `https://`)
- Wait 30 seconds for Railway to restart after changing variables

### "MongoDB connection failed"
- Verify `MONGO_URI` in Railway includes the correct password and cluster name
- Check MongoDB Atlas has IP whitelist set to `0.0.0.0/0` (allow from anywhere, since Railway's IP is dynamic)

### "JWT errors on login"
- Ensure `JWT_SECRET` is set in Railway (not empty)
- Clear browser localStorage and try again

### "API works in Postman but not in browser"
- Check browser console for CORS errors
- Verify Vercel has `VITE_API_URL` set to your Railway backend URL

---

## Part 5: Alternative: Keep Backend Locally (for quick testing)

If you want to iterate faster without deploying the backend:

1. **Run server locally:** `cd server && npm run dev`
2. **Deploy frontend to Vercel** (as above)
3. In Vercel Environment Variables, set:
   - `VITE_API_URL`: `https://your-tunnel-url.ngrok.io` (or use Cloudflare Tunnel for free)
4. Use **ngrok** or **Cloudflare Tunnel** to expose your local server:
   ```bash
   npm install -g ngrok
   ngrok http 5000  # exposes local:5000 to https://xxx-xxx.ngrok.io
   ```
5. Update Vercel env var with the ngrok URL

This is fine for testing but not production (ngrok URLs are ephemeral).

---

## Part 6: Optional — Netlify Instead of Vercel

If you prefer Netlify for the frontend:

1. **Go to https://netlify.com** and connect your GitHub repo
2. **Deploy settings:**
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. **Environment variables:**
   - `VITE_API_URL`: your Railway backend URL
4. Deploy → live

---

## Part 7: Production Checklist (Before Going Live)

- [ ] JWT_SECRET is a random 32+ char string (not the default)
- [ ] ENCRYPTION_KEY is a random 32 char string (not `0123456789abcdef...`)
- [ ] MONGO_URI points to Atlas (not localhost)
- [ ] CLIENT_ORIGIN matches your Vercel/Netlify URL
- [ ] CORS works (test with a real browser request)
- [ ] SSL certificate works (HTTPS only)
- [ ] Tested registration → login → add site → upload CSV → run job
- [ ] Tested rollback functionality
- [ ] Tested audit log
- [ ] MongoDB Atlas has daily backups enabled
- [ ] Error emails set up (or use Sentry/rollbar for prod error tracking)

---

## Part 8: Future Improvements (Post-Testing)

See `ARCHITECTURE.md` section 9 for detailed roadmap. Quick wins:

1. **Move JWT to httpOnly cookie** (currently localStorage, vulnerable to XSS)
2. **Add tests** (Vitest for backend, Playwright for frontend)
3. **Replace polling with Socket.io** for live job progress
4. **Add Bull + Redis** job queue once you exceed ~100 concurrent rows per day

---

## Local Development with Deployed Backend

Once you have the backend deployed, you can develop the frontend against it:

1. **Client .env.local:**
   ```
   VITE_API_URL=https://your-railway-backend-url
   ```

2. **Run:** `cd client && npm run dev`

3. Your local frontend on `http://localhost:5173` will call the deployed backend API

This lets you test in a staging environment while developing.

---

## Costs

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **MongoDB Atlas** | $0 (M0) | Shared cluster, 512 MB storage, auto-pauses after 60 days no activity |
| **Railway** | $5/month credit, then $0.50/GB RAM/month | Generous free tier, pay-as-you-go |
| **Vercel** | $0 | Free tier includes serverless functions and unlimited deployments |
| **Netlify** | $0 | Same as Vercel, free tier is excellent |

**Total for testing phase: ~$5/month or free (if you stay under Railway's free credit).**

---

## Support & Debugging

### Enable debug logging

Set `DEBUG=*` environment variable in Railway or Render to see verbose logs.

### Check logs

- **Railway:** Dashboard → Project → Deployments → View logs
- **Vercel:** Dashboard → Project → Deployments → Logs
- **MongoDB Atlas:** Cluster → Activity → View logs

### Common Issues

See "Troubleshooting" section above, or check `ARCHITECTURE.md` section 7 for security model details.
