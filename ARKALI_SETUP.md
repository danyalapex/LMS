# Arkali Management Console - Setup Guide

## Overview
The Arkali Management Console is now fully implemented. It provides platform administrators with a dashboard to monitor schools, subscriptions, and upcoming renewals.

## Implementation Status

### ✅ Completed
- **Arkali Console UI** (`src/app/(portal)/platform/arkali-management/page.tsx`)
  - Dashboard with KPIs (school count, active subscriptions, MRR)
  - School listing with subscription details
  - Per-school drilldown pages
  - Error handling for missing environment variables

- **Database Schema** (Migration: `supabase/migrations/202603290005_billing_fields.sql`)
  - Added Stripe billing fields: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `next_billing_date`
  - Added indexes for performance
  - Migration helper script: `scripts/apply_migration.ps1`

- **Platform Queries** (`src/lib/platform/queries.ts`)
  - `listPlatformSchools()` - Fetch all schools with current subscriptions
  - `getPlatformOverview()` - Aggregate KPI data
  - `listPlatformPayments()` - Fetch payment history
  - **Resilient fallback**: If Stripe columns missing, queries fall back to base select

- **Authentication & Authorization**
  - Arkali login page with role-based access control
  - `requireRole('platform_admin')` check
  - Optional secret-key bypass (`ARKALI_ACCESS_KEY` environment variable)
  - Secure timing-safe comparison for key validation

- **Webhook & Billing**
  - Stripe webhook integration for subscription events
  - Automatic `next_billing_date` calculation
  - Renewal notifications via cron job (`src/scripts/cron/renewals-check.ts`)

- **Admin Setup**
  - Helper script: `scripts/create-arkali-admin.js`
  - Grants `platform_admin` role to Supabase auth user

- **Helper Scripts**
  - `scripts/apply_migration.ps1` - Apply DB migration locally
  - `scripts/create-arkali-admin.js` - Create platform admin user
  - `scripts/setup-vercel-env.sh` - Configure Vercel environment (bash)

### ⏳ Pending
1. **Apply DB Migration to Cloud Supabase**
   - Migration SQL exists in repo but not yet applied to hosted DB
   - This is required for Stripe billing fields to be available
   - Use: `pwsh ./scripts/apply_migration.ps1` with `DATABASE_URL` environment variable
   - OR use Supabase CLI with service role key (from `.env.local` or Supabase dashboard)

2. **Configure Vercel Environment Variables**
   - Required variables for preview/production deployments:
     - `NEXT_PUBLIC_SUPABASE_URL` (from Supabase project settings)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase project settings → API)
     - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase project settings → API, marked as sensitive)
   - See `.env.local` or Supabase dashboard for actual values
   - Currently missing from preview deployment (causing "failed to load platform data" error)

## Quick Start

### Option 1: Set Vercel Environment Variables (Manual)
1. Go to [Vercel Project Dashboard](https://vercel.com/danyalapexs-projects/rosariosis-12.7)
2. Click **Settings** → **Environment Variables**
3. Add the three environment variables (from `.env.local` or Supabase dashboard):
   - Get `NEXT_PUBLIC_SUPABASE_URL` from local config or Supabase → Project Settings
   - Get `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase → Project Settings → API
   - Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase → Project Settings → API
4. **IMPORTANT**: Mark `SUPABASE_SERVICE_ROLE_KEY` as "Sensitive" (GitHub secret scanning will flag it otherwise)
5. Trigger a redeploy by pushing to the feature branch

### Option 2: Use Vercel CLI
```powershell
# Login to Vercel (already done)
npx vercel link --yes

# Set environment variables (values from .env.local or Supabase dashboard)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
# Enter: <your-supabase-url-from-.env.local>
# Select: Preview, Development, Production

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  
# Enter: <your-anon-key-from-.env.local>
# Select: Preview, Development, Production

npx vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter: <your-service-role-key-from-.env.local>
# Select: Preview, Development, Production
```

### Option 3: Apply Migration & Test Locally
1. Set environment variable: `$env:DATABASE_URL='<your-cloud-db-url>'`
2. Run migration: `pwsh ./scripts/apply_migration.ps1`
3. Verify columns exist in cloud DB
4. Test locally: `npm run dev`
5. Navigate to `/platform/arkali-management` (requires `platform_admin` role)

## Access the Arkali Console

### URL
```
https://<deployment-url>/platform/arkali-management
```

### Authentication Methods
1. **Role-based** (default): User must have `platform_admin` role
   - Create admin with: `node scripts/create-arkali-admin.js`
   - Or insert `user_role_assignments` row directly

2. **Secret Key Bypass** (optional): Set `ARKALI_ACCESS_KEY` env var
   - Pass key via header: `x-arkali-key: <your-secret>`
   - Or via cookie: `arkali_key=<your-secret>`

## Database Migration

### Status
- ✅ Migration SQL created and committed
- ⏳ Needs to be applied to cloud database

### Apply Migration

**Using Supabase CLI:**
```powershell
$env:SUPABASE_ACCESS_TOKEN = '<your-service-role-key-from-.env.local>'
npx supabase db push --project-ref <your-project-ref> --yes
```

**Using Local Helper Script:**
```powershell
$env:DATABASE_URL = 'postgres://user:pass@host:5432/db'
pwsh ./scripts/apply_migration.ps1
```

**Using psql Directly:**
```bash
psql $DATABASE_URL -f ./supabase/migrations/202603290005_billing_fields.sql
```

### Verify Migration
```powershell
# After migration, verify columns exist:
$query = "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='organization_subscriptions' AND column_name IN ('stripe_customer_id','stripe_subscription_id','stripe_price_id','next_billing_date');"

# Run via psql or Supabase dashboard
```

## Troubleshooting

### Error: "failed to load platform data"
- **Cause**: `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel deployment
- **Fix**: Add environment variable to Vercel (see "Quick Start" above) and redeploy

### Error: "column organization_subscriptions.stripe_customer_id does not exist"
- **Cause**: Migration not applied to cloud database
- **Fix**: Apply migration using one of the methods above

### Error: "authentication/authorization failed"
- **Cause**: User doesn't have `platform_admin` role
- **Fix**: Create admin user or bypass with secret key

## Code Changes Summary

### New Files
- `src/app/(portal)/platform/arkali-management/page.tsx` - Console UI
- `src/app/(portal)/platform/organization/[id]/page.tsx` - School detail page
- `src/app/api/platform/arkali/overview/route.ts` - API endpoint
- `supabase/migrations/202603290005_billing_fields.sql` - DB schema
- `scripts/apply_migration.ps1` - Migration helper
- `scripts/create-arkali-admin.js` - Admin setup script

### Modified Files
- `src/lib/platform/queries.ts` - Added Stripe fields, resilient fallback
- `src/app/actions/auth.ts` - Fixed redirects
- `src/app/actions/arkali-auth.ts` - Arkali login action
- `src/scripts/cron/renewals-check.ts` - UTC date fixes
- `src/lib/env.ts` - Env variable validation

### Git
- Feature branch: `feat/arkali-subscriptions`
- PR: #1 (ready to merge after Vercel env vars & migration applied)

## Next Steps

1. ✅ **Verify Code**: Feature branch pushed and ready for review
2. ⏳ **Apply DB Migration**: Run one of the migration commands above
3. ⏳ **Configure Vercel**: Add environment variables to preview/production
4. ⏳ **Test Preview**: Navigate to Arkali console and verify data loads
5. ⏳ **Merge PR**: Once verified, merge `feat/arkali-subscriptions` to `main`

---

**Questions?** Refer to this guide or check the feature branch commits for implementation details.
