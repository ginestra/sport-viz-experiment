# Supabase Setup Guide

This guide will help you set up Supabase for the collaborative writing feature.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: Choose a name (e.g., "thatlab")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for development
4. Click "Create new project" and wait for it to initialize (2-3 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Create Environment File

Create a file named `.env.local` in the root of your project with:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace the placeholder values with your actual values from Step 2.

**Important**: 
- `.env.local` is already in `.gitignore` so it won't be committed
- Never commit your service_role key to git
- The `VITE_` prefix is required for Vite to expose these variables to the client

## Step 4: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_initial_schema.sql` in your project
3. Copy the entire contents of that file
4. Paste it into the Supabase SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for it to complete - you should see "Success. No rows returned"

**Note:** You can run the entire file at once - Supabase SQL Editor handles multiple statements automatically!

## Step 5: Configure Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Enable **Email** provider (should be enabled by default)

**For Local Testing (Recommended):**
- Go to **Authentication** > **Settings**
- Under **Email Auth**, toggle **"Enable email confirmations"** to **OFF**
- This allows immediate sign-in after signup (no email verification needed)
- You can re-enable this for production

3. (Optional) Enable **Google** or **GitHub** for OAuth:
   
   **For GitHub OAuth:**
   - Go to **Authentication** > **Providers** in Supabase dashboard
   - Find **GitHub** in the list and click on it
   - Toggle **Enable GitHub provider** to ON
   - You'll need to create a GitHub OAuth App:
     1. Go to GitHub → Settings → Developer settings → OAuth Apps
     2. Click "New OAuth App"
     3. Fill in:
        - **Application name**: That Lab (or your app name)
        - **Homepage URL**: `http://localhost:5176` (or your production URL)
        - **Authorization callback URL**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
          (Find YOUR_PROJECT_REF in your Supabase project URL)
     4. Click "Register application"
     5. Copy the **Client ID** and **Client Secret**
   - Back in Supabase, paste the **Client ID** and **Client Secret**
   - Click **Save**
   - Add the redirect URL: `http://localhost:5176/#/collaborative` (or your production URL)
   
   **For Google OAuth:**
   - Similar process but using Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## Step 6: Assign Your Super Admin Role

After creating your account and logging in, you'll need to assign yourself the super_admin role:

1. In Supabase dashboard, go to **Authentication** > **Users**
2. Find your user and copy the **User UID**
3. Go to **SQL Editor** and run:

```sql
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES ('your-user-uid-here', 'super_admin', 'your-user-uid-here');
```

Replace `your-user-uid-here` with your actual User UID.

## Step 7: Restart Dev Server

After creating `.env.local`, restart your development server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

The app should now connect to Supabase!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists in the project root
- Make sure variable names start with `VITE_`
- Restart the dev server after creating/updating `.env.local`

### "Invalid API key"
- Double-check you copied the keys correctly (no extra spaces)
- Make sure you're using the `anon` key, not the `service_role` key for `VITE_SUPABASE_ANON_KEY`

### Database connection errors
- Make sure your Supabase project is fully initialized
- Check that you've run the SQL schema from `SUPABASE_SCHEMA.md`
- Verify your database password is correct

## Production Deployment

For production (Vercel, Netlify, etc.):

1. Add the same environment variables in your hosting platform's dashboard
2. For Vercel: Go to Project Settings > Environment Variables
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for serverless functions)

## Security Notes

- The `anon` key is safe to expose in client-side code (it's protected by RLS)
- The `service_role` key should ONLY be used in server-side code (API routes)
- Never commit `.env.local` to git
- Use different Supabase projects for development and production

