# Vercel Deployment Guide

This guide explains how to deploy the collaborative writing feature to Vercel with proper environment variable configuration.

## Prerequisites

1. A Supabase project (see `SUPABASE_SETUP.md`)
2. A Vercel account connected to your GitHub repository

## Step 1: Set Environment Variables in Vercel

Environment variables must be configured in Vercel for the production build to work.

### Accessing Vercel Environment Variables

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

### Required Environment Variables

#### For Client-Side (VITE_ prefix required)

These variables are bundled into the client-side JavaScript and are safe to expose:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** and **anon/public key**

#### For Serverless Functions (No VITE_ prefix)

These variables are only available server-side and are **NEVER** exposed to the client:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find this:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **service_role key** (⚠️ Keep this secret!)

**🔒 Security Note:** 
- Variables **WITHOUT** the `VITE_` prefix are **NOT** bundled into client-side JavaScript
- They are **ONLY** available to serverless functions via `process.env`
- The service role key will **NEVER** appear in your client-side bundle
- Vercel encrypts all environment variables at rest
- ✅ **Safe to add to Vercel** - it's server-side only

### Setting Environment Variables

For each variable:

1. Click **Add New**
2. Enter the **Key** (e.g., `VITE_SUPABASE_URL`)
3. Enter the **Value** (your actual value)
4. Select the **Environments** where it should be available:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional, for Vercel CLI)
5. Click **Save**

### Important Notes

- **VITE_ prefix**: Variables starting with `VITE_` are exposed to the client-side bundle. This is intentional and safe for Supabase anon keys (they're protected by RLS).
- **Service Role Key**: 
  - ✅ **DO add** `SUPABASE_SERVICE_ROLE_KEY` to Vercel (without `VITE_` prefix)
  - ✅ It's **safe** because it's only available server-side (serverless functions)
  - ❌ **NEVER** use `VITE_` prefix for `SUPABASE_SERVICE_ROLE_KEY` - that would expose it to the client
  - The key will **NOT** appear in your client-side JavaScript bundle
- **After adding variables**: You need to **redeploy** your application for changes to take effect.

## Step 2: Redeploy After Adding Variables

After setting environment variables:

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic deployment

## Step 3: Verify Deployment

After redeploying:

1. Visit your live site
2. Check the browser console for errors
3. Try accessing the Collaborative Writing section
4. Verify authentication works

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Cause:** Environment variables not set in Vercel or not redeployed after setting them.

**Solution:**
1. Verify variables are set in Vercel Settings → Environment Variables
2. Ensure variables are enabled for **Production** environment
3. Redeploy the application
4. Check that variable names match exactly (case-sensitive)

### Error: "Invalid API key"

**Cause:** Wrong key copied or extra spaces.

**Solution:**
1. Double-check you copied the correct key from Supabase
2. Remove any leading/trailing spaces
3. Ensure you're using the **anon/public key** for `VITE_SUPABASE_ANON_KEY`
4. Redeploy after fixing

### Variables Not Updating

**Cause:** Cached build or variables not enabled for the right environment.

**Solution:**
1. Clear Vercel build cache (Settings → General → Clear Build Cache)
2. Ensure variables are enabled for Production, Preview, and Development
3. Force a new deployment

## Environment Variable Reference

| Variable | Required | Client/Server | Description |
|----------|----------|---------------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Client | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server | Supabase service role key (for API functions) |

## Security Reminders

- ✅ `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are safe to expose (protected by RLS)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` should be added to Vercel (without `VITE_` prefix)
- ✅ Service role key is **automatically protected** - variables without `VITE_` prefix are server-side only
- ✅ Service role key is only used in serverless functions (`api/collaborative/delete-account.js`)
- ✅ The service role key will **NEVER** appear in your client-side JavaScript bundle
- ✅ All environment variables in Vercel are encrypted at rest
- ❌ **NEVER** add `VITE_` prefix to `SUPABASE_SERVICE_ROLE_KEY` - that would expose it to the client

## Quick Setup Checklist

- [ ] Supabase project created
- [ ] Database schema migrated (`supabase/migrations/001_initial_schema.sql`)
- [ ] Environment variables set in Vercel:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Variables enabled for Production environment
- [ ] Application redeployed
- [ ] Tested on live site

