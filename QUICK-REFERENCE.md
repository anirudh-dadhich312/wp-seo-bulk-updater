# ⚡ Quick Reference: Everything You Need to Know on 1 Page

Print this page. Bookmark it. Reference it daily during launch.

---

## 📍 READING GUIDE

```
START HERE → START-HERE.md (5 min overview)
        ↓
UNDERSTAND → PLATFORMS-EXPLAINED.md (what is each service)
        ↓
DEPLOY → STEP-BY-STEP-DEPLOY.md (detailed instructions)
        ↓
TEST → TESTING-FEEDBACK.md (user testing guide)
        ↓
REFERENCE → This file (when you need to remember something)
```

---

## 🎯 YOUR NEXT 30 MINUTES

```
NOW
  ↓
Read PLATFORMS-EXPLAINED.md (10 min)
  ↓
Follow STEP-BY-STEP-DEPLOY.md (20 min)
  ↓
DONE! App is live
```

---

## 📋 DEPLOYMENT CHECKLIST

### Create Accounts (5 min total)
- [ ] MongoDB: mongodb.com/cloud/atlas
- [ ] Railway: railway.app
- [ ] Vercel: vercel.com

### Set Up Database (5 min)
```
MongoDB Atlas:
  ☐ Create free M0 cluster
  ☐ Create database user (username + password)
  ☐ Allow IP 0.0.0.0/0
  ☐ Copy connection string
```

### Deploy Backend (5 min)
```
Railway:
  ☐ Connect GitHub repo
  ☐ Select /server folder as root
  ☐ Add environment variables:
    - MONGO_URI (from MongoDB)
    - JWT_SECRET (run: node generate-secrets.js)
    - ENCRYPTION_KEY (from generate-secrets.js)
    - NODE_ENV = production
    - PORT = 10000
  ☐ Click Deploy
  ☐ Wait for "✓ Deployment successful"
  ☐ Copy your Railway URL
```

### Deploy Frontend (5 min)
```
Vercel:
  ☐ Connect GitHub repo
  ☐ Set root directory = client
  ☐ Add environment variable:
    - VITE_API_URL = [Your Railway URL]
  ☐ Click Deploy
  ☐ Wait for "✓ Deployment successful"
  ☐ Copy your Vercel URL
```

### Final Step (1 min)
```
Railway → Edit CLIENT_ORIGIN:
  ☐ Set CLIENT_ORIGIN = [Your Vercel URL]
  ☐ Railway auto-redeploys
  ☐ Done!
```

---

## 🔗 KEY URLS DURING TESTING

```
Your App:
  Frontend: https://your-app.vercel.app
  Backend API: https://api-xxx.up.railway.app

Dashboards to Monitor:
  Railway logs: railway.app/dashboard
  Vercel deployment: vercel.com/dashboard
  MongoDB Atlas: cloud.mongodb.com
```

---

## ⚙️ ENVIRONMENT VARIABLES

### What They Are
- Settings that change how your app behaves
- Different for testing vs production
- Never hardcode passwords in code!

### Where to Set Them
```
Backend (Railway):
  MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
  JWT_SECRET=[from generate-secrets.js]
  ENCRYPTION_KEY=[from generate-secrets.js]
  NODE_ENV=production
  CLIENT_ORIGIN=https://your-vercel-url.com
  PORT=10000

Frontend (Vercel):
  VITE_API_URL=https://your-railway-url.com
```

### How to Generate
```bash
cd server
node generate-secrets.js
# Copy the output into Railway
```

---

## 🐛 COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| Blank page on Vercel | `VITE_API_URL` not set | Set it in Vercel, redeploy |
| CORS error in console | `CLIENT_ORIGIN` wrong | Fix in Railway (check spelling!) |
| MongoDB connection failed | Wrong password/URI | Check `MONGO_URI` in Railway |
| Can't add WordPress site | Connection error | Check WP credentials + plugin installed |
| Job doesn't update WordPress | Plugin not detected | Check bridge plugin is active in WP |
| App crashes on login | JWT_SECRET empty | Generate and set `JWT_SECRET` |

---

## 📊 MONITORING DURING TESTING

### Daily (5 minutes)
```
☐ Check Railway logs (any red errors?)
  → railway.app → Click project → Logs tab
  
☐ Check Vercel status (deployment successful?)
  → vercel.com → Click project → Deployments tab
  
☐ Check MongoDB (cluster healthy?)
  → cloud.mongodb.com → Metrics tab
```

### When Something Breaks
```
1. Check logs (see what error happened)
2. Find root cause (typo, missing env var, code bug)
3. Fix it (edit code or env var)
4. Commit if code change: git push origin main
5. Railway/Vercel auto-redeploy in 2-3 minutes
6. Test again
```

---

## 📱 TESTING WORKFLOW

### Week 1: Invite Users
```
Create feedback form (Google Form)
Write test instructions (simple step-by-step)
Send to 5 people:
  - Email + instructions
  - Link to your app
  - Link to feedback form
```

### Week 1: Collect Feedback
```
Ask:
  1. How easy to use? (1-5)
  2. Did it work? (Yes/No)
  3. What went wrong? (If no)
  4. What could improve?
  5. Would you use this?
```

### Week 2: Iterate
```
Monday: Read feedback
Tuesday: Prioritize top 3 issues
Wednesday: Fix + push to GitHub (auto-deploy)
Thursday: Test fixes + get more feedback
Friday: Weekly summary + next steps
```

---

## 🎯 SUCCESS METRICS

```
Day 1:
  ✓ App accessible at Vercel URL
  ✓ Can register user
  ✓ Can add WordPress site
  ✓ Can upload & run CSV
  ✓ WordPress updated

Week 1:
  ✓ 5+ users testing
  ✓ 80%+ completed full flow
  ✓ <5% critical errors

Week 2:
  ✓ 30+ users testing
  ✓ 2+ improvements shipped
  ✓ Positive feedback coming in

Week 4:
  ✓ 100+ users tested
  ✓ Ready for production decision
  ✓ Users would recommend it
```

---

## 💰 COSTS TRACKER

```
Month 1 (Testing):
  MongoDB: $0 (free tier)
  Railway: $0 (under $5 credit)
  Vercel: $0 (free tier)
  TOTAL: $0 ✓

Month 2 (Scaling):
  MongoDB: $0 (still under 512 MB)
  Railway: $3 (under $5 credit)
  Vercel: $0 (free tier)
  TOTAL: $0 ✓

Month 3+ (Growth):
  MongoDB: $0-11 (depends on data size)
  Railway: $5-15 (depends on traffic)
  Vercel: $0-20 (depends on usage)
  TOTAL: $5-46/month
```

---

## 🚨 EMERGENCY PROCEDURES

### App is Down
```
1. Check railway.app (is it deployed?)
2. Check vercel.com (is it deployed?)
3. Check cloud.mongodb.com (cluster running?)
4. Check logs for errors
5. Fix code or env var
6. Push to GitHub if code change
7. Auto-redeploy in 2-3 minutes
```

### User Reports Bug
```
1. Ask: What did you do? What happened?
2. Check Railway logs for their requests
3. Reproduce locally if possible
4. Find root cause
5. Fix + push (if code)
6. Or update env var (if configuration)
7. Email user: "Fixed! Try again"
```

### Data Looks Wrong
```
1. Check MongoDB Atlas
2. Look for recent errors
3. Check if data got corrupted
4. If backups available, consider restore
5. Consider data migration
```

---

## 📁 IMPORTANT FILES

```
Server (.env variables):
  server/.env.example → shows what variables you need
  server/generate-secrets.js → generates secure values

Frontend (env variables):
  client/.env.example → shows what variables you need

Deployment configs:
  client/vercel.json → Vercel auto-deploy config
  server/railway.toml → Railway auto-deploy config

Documentation (read in order):
  START-HERE.md → Overview
  PLATFORMS-EXPLAINED.md → Understanding services
  STEP-BY-STEP-DEPLOY.md → Detailed instructions
  TESTING-FEEDBACK.md → User testing guide
  DEPLOYMENT.md → Advanced options
```

---

## 🔑 CRITICAL THINGS NOT TO FORGET

```
❌ FORGET THESE → APP BROKEN

❌ Don't use example JWT_SECRET
   → Users can't log in

❌ Don't forget CLIENT_ORIGIN in Railway
   → CORS errors, frontend can't call API

❌ Don't use wrong MONGO_URI
   → Database connection fails

❌ Don't leave VITE_API_URL empty
   → Frontend doesn't know where backend is

❌ Don't hardcode passwords in code
   → Security disaster, passwords exposed

✅ DO THESE → APP WORKS

✅ Generate secure JWT_SECRET + ENCRYPTION_KEY
✅ Set CLIENT_ORIGIN = your Vercel URL
✅ Set VITE_API_URL = your Railway URL
✅ Check IP whitelist = 0.0.0.0/0 in MongoDB
✅ Push to GitHub → auto-redeploy
```

---

## 🔄 WEEKLY ROUTINE

```
MONDAY (15 min)
  ☐ Read new feedback responses
  ☐ Log issues in spreadsheet
  ☐ Prioritize top 3 issues

TUESDAY (15 min)
  ☐ Start coding fixes for top issues
  ☐ Check logs for patterns

WEDNESDAY (30 min)
  ☐ Finish fixes
  ☐ Test locally
  ☐ Push to GitHub
  ☐ Wait 3 min for auto-deploy
  ☐ Test on live URL

THURSDAY (15 min)
  ☐ Respond to user questions
  ☐ Notify testers about fixes

FRIDAY (15 min)
  ☐ Write weekly summary
  ☐ Calculate metrics
  ☐ Plan next week

WEEKEND
  ☐ Rest! (App keeps running)
```

---

## 🎓 LEARNING PATH

If you don't understand something:

```
"What is Vercel?" → PLATFORMS-EXPLAINED.md
"How do I deploy?" → STEP-BY-STEP-DEPLOY.md
"How do I test with users?" → TESTING-FEEDBACK.md
"Why is my app broken?" → QUICK-REFERENCE.md (this file)
"How do I debug this error?" → Check Railway/Vercel logs
"What's the system architecture?" → ARCHITECTURE.md
```

---

## ⚡ SUPER QUICK DEPLOYMENT (Experienced Users)

```bash
# Generate credentials
cd server && node generate-secrets.js

# Create MongoDB Atlas cluster
# → Create user
# → Get connection string

# Deploy to Railway
# → Connect GitHub
# → Set MONGO_URI, JWT_SECRET, ENCRYPTION_KEY, CLIENT_ORIGIN

# Deploy to Vercel
# → Connect GitHub
# → Set VITE_API_URL

# Update Railway CLIENT_ORIGIN

# Test
# → Open Vercel URL
# → Register → add site → run job
# → Check WordPress was updated

# Done! 🎉
```

---

## 📞 SUPPORT RESOURCES

| Issue | Resource |
|-------|----------|
| General deployment | START-HERE.md |
| Understanding platforms | PLATFORMS-EXPLAINED.md |
| Step-by-step setup | STEP-BY-STEP-DEPLOY.md |
| Testing with users | TESTING-FEEDBACK.md |
| Troubleshooting | STEP-BY-STEP-DEPLOY.md (Part 10) |
| API documentation | README.md |
| System design | ARCHITECTURE.md |

---

## ✅ FINAL CHECKLIST BEFORE GOING LIVE

```
SETUP:
  ☐ Code pushed to GitHub
  ☐ MongoDB cluster created + user created + connection string copied
  ☐ Credentials generated (JWT_SECRET, ENCRYPTION_KEY)

DEPLOYMENT:
  ☐ Railway backend deployed successfully
  ☐ Vercel frontend deployed successfully
  ☐ CLIENT_ORIGIN updated in Railway
  ☐ VITE_API_URL set in Vercel

TESTING:
  ☐ Can open Vercel URL
  ☐ Can register user
  ☐ Can add WordPress site
  ☐ Can upload CSV
  ☐ Can run job
  ☐ WordPress was updated with new meta
  ☐ Can test rollback

MONITORING:
  ☐ Know how to check Railway logs
  ☐ Know how to check Vercel logs
  ☐ Know how to check MongoDB Atlas
  ☐ Set phone reminder to check daily

USERS:
  ☐ Feedback form created
  ☐ Test instructions written
  ☐ 5+ users invited
  ☐ Monitoring for errors

READY TO LAUNCH! 🚀
```

---

**PRINT THIS PAGE AND KEEP IT NEARBY DURING YOUR FIRST WEEK OF TESTING.**

When you get confused or forget something, come back here first! 📌
