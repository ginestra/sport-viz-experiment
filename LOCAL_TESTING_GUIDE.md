# Local Testing Guide

## Authentication Testing - What Works Locally

### ✅ Email/Password Authentication (Works Locally)

**Sign Up:**
- ✅ Works perfectly locally
- ⚠️ **Email Verification**: By default, Supabase requires email verification before you can sign in
- **Solution**: You have two options:

  **Option 1: Disable Email Confirmation (Recommended for Local Testing)**
  1. Go to Supabase Dashboard → **Authentication** → **Settings**
  2. Under **Email Auth**, find **"Enable email confirmations"**
  3. **Toggle it OFF** for local development
  4. Users can sign in immediately after signup

  **Option 2: Use Email Confirmation Links**
  - After signup, check your email (or Supabase logs)
  - Click the confirmation link
  - Then sign in

**Sign In:**
- ✅ Works perfectly locally once email is verified (or confirmation is disabled)

### ⚠️ OAuth (GitHub/Google) - Requires Setup

**For Local Testing:**
- OAuth redirects work with `localhost` URLs
- You need to configure the OAuth provider with `http://localhost:5176` as the redirect URL
- See `SUPABASE_SETUP.md` Step 5 for detailed instructions

**Testing OAuth Locally:**
1. Make sure GitHub/Google OAuth is enabled in Supabase
2. Make sure redirect URL includes `http://localhost:5176/#/collaborative`
3. Click the OAuth button
4. You'll be redirected to GitHub/Google
5. After authorization, you'll be redirected back to localhost

## Quick Setup for Local Testing

### 1. Disable Email Confirmation (Easiest for Testing)

1. Go to Supabase Dashboard
2. **Authentication** → **Settings**
3. Scroll to **Email Auth** section
4. Toggle **"Enable email confirmations"** to **OFF**
5. Click **Save**

Now you can:
- Sign up with any email
- Sign in immediately without email verification

### 2. Test Sign Up Flow

1. Go to `http://localhost:5176/#/collaborative/register`
2. Fill in:
   - Email: `test@example.com` (any email works)
   - Password: `test123` (min 6 characters)
   - Confirm password: `test123`
   - Check consent checkbox
3. Click "Sign Up"
4. Should see success message
5. Can immediately sign in

### 3. Test Sign In Flow

1. Go to `http://localhost:5176/#/collaborative/login`
2. Enter the email and password you just created
3. Click "Sign In"
4. Should redirect to `/collaborative` page
5. Should see your email in the header
6. Should see "Sign Out" button

### 4. Test Sign Out

1. Click "Sign Out" button
2. Should redirect to home page
3. Should see "Sign In" and "Sign Up" buttons instead

## Testing Multiple Users

To test with multiple users:

1. **User 1**: Sign up with `user1@test.com`
2. **User 2**: Sign up with `user2@test.com` (in incognito/private window)
3. Or use different browsers
4. Or sign out and create a new account

## Common Issues

### "Email not confirmed"
- **Solution**: Disable email confirmation in Supabase settings (see above)

### "Invalid login credentials"
- Make sure you're using the correct email/password
- If you disabled email confirmation, try signing up again

### OAuth redirects to wrong URL
- Check that redirect URL in Supabase includes `http://localhost:5176/#/collaborative`
- Check that GitHub/Google OAuth app has correct callback URL

### Session not persisting
- Check browser console for errors
- Make sure `.env.local` has correct Supabase credentials
- Try clearing browser cache/cookies

## Testing Checklist for Authentication

- [ ] Can sign up with email/password
- [ ] Can sign in immediately (if email confirmation disabled)
- [ ] Can sign out
- [ ] Session persists on page refresh
- [ ] Protected routes redirect to login when not authenticated
- [ ] Can access protected routes when authenticated
- [ ] OAuth works (if enabled and configured)

