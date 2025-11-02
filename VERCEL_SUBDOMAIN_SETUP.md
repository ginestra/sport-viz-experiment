# Vercel Subdomain Setup Guide

## Changing Subdomain to `thatlab`

### Steps:

1. **Navigate to Vercel Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Sign in and select your project

2. **Access Project Settings**
   - Click on your project
   - Go to the "Settings" tab
   - Navigate to "Domains" section

3. **Update Domain/Subdomain**
   - Click "Add" or "Edit" next to the domain configuration
   - For Vercel's default deployment:
     - Your current deployment URL: `sport-viz-experiment.vercel.app` (or similar)
     - Update to: `thatlab.vercel.app`
   - For custom domain:
     - If you have a custom domain, you can add `thatlab.yourdomain.com` as an alias

4. **Vercel Automatic Updates**
   - Vercel automatically generates deployment URLs based on project name
   - To change the default subdomain, you may need to:
     - Rename your project in Vercel dashboard (Settings > General > Project Name)
     - Or add a custom domain/subdomain

5. **Verify Configuration**
   - Once updated, Vercel will automatically deploy with the new subdomain
   - DNS changes may take a few minutes to propagate
   - Test the new URL: `https://thatlab.vercel.app` (or your custom domain)

### Best Practices:

- **Keep old URLs working**: If you have existing links, consider setting up redirects
- **Update documentation**: Update any README or documentation with new URLs
- **Test thoroughly**: Verify all routes work correctly on the new subdomain

### Current Routing:

This site uses hash-based routing (svelte-spa-router). URLs will look like:
- `https://thatlab.vercel.app/#/`
- `https://thatlab.vercel.app/#/experiments`
- `https://thatlab.vercel.app/#/experiments/sport-viz/womens-football`

The Vercel configuration in `vercel.json` includes rewrites to support client-side routing.

