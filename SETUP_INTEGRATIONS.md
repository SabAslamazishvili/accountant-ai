# Setting Up Integrations for Accountant AI

Your application is deployed at: **https://accountant-ai-gamma.vercel.app**

To make it fully functional, you need to set up the following integrations through the Vercel dashboard.

## Quick Setup (5 minutes)

### 1. Vercel Postgres Database (Required)

1. Go to https://vercel.com/sabaslamazishvilis-projects/accountant-ai
2. Click **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Name it `accountant-db`
6. Select region: **Washington, D.C. (iad1)** (same as your app)
7. Click **Create**
8. Vercel will automatically add `POSTGRES_*` environment variables
9. The app will use `POSTGRES_URL` as the DATABASE_URL

### 2. Vercel Blob Storage (Required for file uploads)

1. In the same **Storage** tab
2. Click **Create Database**
3. Select **Blob**
4. Name it `accountant-blob`
5. Select region: **Washington, D.C. (iad1)**
6. Click **Create**
7. Vercel will automatically add `BLOB_READ_WRITE_TOKEN`

### 3. Anthropic API Key (Required for AI features)

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys**
4. Click **Create Key**
5. Copy the key
6. Go back to Vercel: https://vercel.com/sabaslamazishvilis-projects/accountant-ai/settings/environment-variables
7. Click **Add New**
   - Name: `ANTHROPIC_API_KEY`
   - Value: [paste your key]
   - Select all environments
8. Click **Save**

### 4. Google OAuth (Optional - for Google Sign-In)

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   - `https://accountant-ai-gamma.vercel.app/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**
8. Add to Vercel environment variables:
   - `GOOGLE_CLIENT_ID`: [paste Client ID]
   - `GOOGLE_CLIENT_SECRET`: [paste Client Secret]

### 5. Resend API Key (Optional - for email notifications)

1. Go to https://resend.com/
2. Sign up and verify your email
3. Go to **API Keys**
4. Create a new API key
5. Copy the key
6. Add to Vercel: `RESEND_API_KEY`: [paste key]
7. Note: On free tier, you can only send from verified domains

## After Setup

1. **Redeploy the application** to apply all environment variables:
   ```bash
   vercel --prod
   ```

2. **Run database migrations**:
   ```bash
   # Pull the production DATABASE_URL
   vercel env pull

   # Push the schema to production database
   npx prisma db push
   ```

3. **Test the application**:
   - Visit https://accountant-ai-gamma.vercel.app
   - Sign up for a new account
   - Test the full flow

## Environment Variables Summary

After setup, you should have these environment variables in production:

✅ Already configured:
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Application URL
- `ENCRYPTION_KEY` - For encrypting sensitive data

⚠️ Need to configure:
- `POSTGRES_URL` or `DATABASE_URL` - Database connection (from Vercel Postgres)
- `BLOB_READ_WRITE_TOKEN` - File storage (from Vercel Blob)
- `ANTHROPIC_API_KEY` - AI features (from Anthropic)
- `GOOGLE_CLIENT_ID` - OAuth (optional, from Google Cloud)
- `GOOGLE_CLIENT_SECRET` - OAuth (optional, from Google Cloud)
- `RESEND_API_KEY` - Emails (optional, from Resend)

## Checking Current Variables

```bash
vercel env ls
```

## Troubleshooting

**Database connection errors:**
- Make sure Vercel Postgres is created and linked
- Check that `POSTGRES_URL` is set in environment variables
- Run `npx prisma db push` to create tables

**File upload errors:**
- Ensure Vercel Blob is created and linked
- Check `BLOB_READ_WRITE_TOKEN` is set

**AI categorization not working:**
- Verify `ANTHROPIC_API_KEY` is valid
- Check API usage limits at console.anthropic.com

**Google OAuth not working:**
- Verify redirect URI matches exactly
- Check both Client ID and Secret are set
- Ensure Google+ API is enabled

## Support

For issues, check the deployment logs:
```bash
vercel logs accountant-ai-gamma.vercel.app --follow
```
