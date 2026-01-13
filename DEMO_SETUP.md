# 🚀 Demo Setup Guide

## Current Status

✅ **Server Running:** http://localhost:3000
✅ **Landing Page:** Working
✅ **UI Components:** All created
✅ **API Routes:** Implemented
✅ **Prisma Client:** Generated

## Quick Demo (UI Only)

The **landing page** is fully functional right now at:
- **http://localhost:3000**

You can see:
- Beautiful landing page with feature cards
- "Get Started" and "Sign In" buttons
- Responsive design with Tailwind CSS

## Full Demo Setup (With Database)

To test the complete application including authentication and features:

### Step 1: Set Up PostgreSQL

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (if not installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from postgresql.org

# Create database
createdb accountant_demo

# Update .env.local with your credentials
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/accountant_demo"
```

**Option B: Cloud Database (Recommended for Demo)**
Use a free tier service:
- **Vercel Postgres:** https://vercel.com/docs/storage/vercel-postgres
- **Supabase:** https://supabase.com (includes free PostgreSQL)
- **Railway:** https://railway.app
- **Neon:** https://neon.tech

### Step 2: Initialize Database

```bash
cd /workspace/cmkcetrcu0091inojcbq7k1s8/accountant-ai

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### Step 3: Configure Optional Services

Edit `.env.local`:

```env
# For AI Features (get free trial key)
ANTHROPIC_API_KEY="sk-ant-..."  # https://console.anthropic.com

# For Google Login (optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-secret"
# Get from: https://console.cloud.google.com

# For File Upload (optional)
BLOB_READ_WRITE_TOKEN="vercel_blob_token"
# Get from: https://vercel.com/dashboard/stores

# For Email Notifications (optional)
RESEND_API_KEY="re_..."
# Get from: https://resend.com
```

### Step 4: Restart Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Testing the Application

### 1. Create an Account
1. Visit http://localhost:3000
2. Click "Get Started"
3. Fill in:
   - Name: Test User
   - Email: demo@test.com
   - Password: testpassword123
4. Click "Create Account"

### 2. Sign In
1. Go to http://localhost:3000/login
2. Enter your credentials
3. You'll be redirected to onboarding

### 3. Complete Business Setup
1. Fill in business details:
   - Company Name: Demo Business
   - TIN: 123456789 (9 digits)
   - Select at least one bank
2. Click "Complete Setup"
3. You'll see the dashboard

### 4. Explore Features

**Dashboard** (http://localhost:3000/dashboard)
- View deadline reminders
- See recent declarations
- Check notifications

**Upload** (http://localhost:3000/upload)
*(Note: Requires BLOB_READ_WRITE_TOKEN)*
- Upload bank statements
- Process with AI
- Generate declarations

## Demo Limitations

Without full configuration, some features won't work:

| Feature | Requires | Works Without |
|---------|----------|---------------|
| Landing Page | Nothing | ✅ Yes |
| Sign Up/Login | Database | ❌ No |
| Dashboard | Database | ❌ No |
| File Upload | Vercel Blob | ❌ No |
| AI Processing | Anthropic API | ⚠️ Fallback |
| Email Notifications | Resend | ⚠️ Silent fail |
| rs.ge Submission | Service creds | ⚠️ Mock mode |

## Minimal Working Demo

For a **quick working demo with auth**, you only need:

1. **PostgreSQL database** (use free cloud service)
2. **Run prisma db push**
3. **Restart server**

Then you can:
- ✅ Create accounts
- ✅ Sign in
- ✅ Complete onboarding
- ✅ View dashboard
- ✅ See UI components

## Architecture Overview

```
┌─────────────────┐
│  Landing Page   │  ← Currently visible
│   (Next.js)     │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Auth    │  Needs: Database
    │(NextAuth)│
    └────┬─────┘
         │
    ┌────▼──────┐
    │ Dashboard │  Needs: Database + Auth
    └────┬──────┘
         │
    ┌────▼──────┐
    │  Upload   │  Needs: Database + Vercel Blob
    └────┬──────┘
         │
    ┌────▼──────┐
    │    AI     │  Needs: Anthropic API
    │ Processing│
    └────┬──────┘
         │
    ┌────▼──────┐
    │   rs.ge   │  Needs: Georgian tax credentials
    │ Submission│
    └───────────┘
```

## Quick Test Without Database

Want to see the UI without setting up a database?

The **landing page, login page, and signup page** all work without a database:

1. **Landing:** http://localhost:3000 ✅
2. **Login UI:** http://localhost:3000/login ✅
3. **Signup UI:** http://localhost:3000/signup ✅

These pages show the complete UI/UX design even without backend functionality.

## Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Database connection error"
- Check your DATABASE_URL in `.env.local`
- Ensure PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

### "Port 3000 already in use"
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Server won't start
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Restart
npm run dev
```

## Production Deployment

Ready to deploy? Check out:
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Railway Deployment](https://railway.app)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

---

**Need help?** Check the main [README.md](./README.md) for more details.
