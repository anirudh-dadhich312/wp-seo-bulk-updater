# 🚀 Quick Start: Deploy to Vercel + Railway (5 minutes)

You have a fully functional app. Here's how to get it live **right now**:

---

## Step 1: Generate Secure Credentials (2 min)

```bash
cd server
node generate-secrets.js
```

Copy the output. You'll paste these into Railway in the next step.

---

## Step 2: Deploy Backend to Railway (2 min)

1. **Go to https://railway.app**
2. Sign up with GitHub (authorize the app)
3. **New Project** → **Deploy from GitHub repo**
4. Select `wp-seo-bulk-updater`
5. **Configure:**
   - Root directory: `server`
   - **Variables** (paste the secrets from step 1):
     - `MONGO_URI`: from MongoDB Atlas (see step 3 below if you need to create it)
     - `JWT_SECRET`: from `generate-secrets.js` output
     - `ENCRYPTION_KEY`: from `generate-secrets.js` output
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
     - `CLIENT_ORIGIN`: leave blank for now
6. **Deploy** and wait ~2 min for the build to complete

When done, you'll see a URL like `https://wp-seo-bulk-updater-api-prod-xxx.up.railway.app`

**Save this URL.**

---

## Step 3: Set Up MongoDB Atlas (if needed)

If you don't have a MongoDB Atlas account:

1. **Go to https://www.mongodb.com/cloud/atlas**
2. Sign up free
3. Create a free M0 cluster in any region
4. Create a database user (e.g., `seo-updater` / password: generate a strong one)
5. Get the connection string: `mongodb+srv://seo-updater:PASSWORD@cluster.mongodb.net/seo-updater`
6. Go back to Railway, add `MONGO_URI` variable with this string
7. Railway redeploys automatically

---

## Step 4: Deploy Frontend to Vercel (1 min)

1. **Go to https://vercel.com**
2. Sign up with GitHub
3. **Add New Project** → select your repo
4. **Configure:**
   - Root directory: `client`
   - Framework: React
5. **Environment Variables:**
   - `VITE_API_URL`: paste your Railway URL from step 2
6. **Deploy** and wait ~1 min

You get a URL like `https://wp-seo-bulk-updater.vercel.app`

**Save this URL.**

---

## Step 5: Update Backend CORS (30 sec)

1. Go back to **Railway**
2. **Variables** → Edit `CLIENT_ORIGIN`
3. Paste your Vercel URL
4. **Railway redeploys automatically**

---

## Step 6: Test It

1. Open your **Vercel URL** in the browser
2. **Register** a new user
3. **Add a test WordPress site** (any site with the bridge plugin installed)
4. **Upload a 1-row CSV** to test
5. **Run the job** and watch it update

If that works → **You're live!** 🎉

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error | Wait 1 min for Railway to restart with new `CLIENT_ORIGIN` |
| MongoDB connection fails | Check `MONGO_URI` has correct password and cluster name; check Atlas allows `0.0.0.0/0` |
| Frontend won't load | Check `VITE_API_URL` in Vercel matches your Railway URL exactly |
| JWT/auth errors | Clear browser localStorage and try again |

---

## What's Next?

- See `DEPLOYMENT.md` for detailed options (Netlify, Render, local backend, etc.)
- See `ARCHITECTURE.md` section 9 for improvements (tests, WebSockets, key rotation, etc.)
- See `README.md` for API docs and CSV format reference

---

## Cost

- **Total: Free or ~$5/month**
  - MongoDB Atlas M0: Free
  - Railway: $5/month free credit (more than enough for testing)
  - Vercel: Free
