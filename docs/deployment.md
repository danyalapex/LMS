# Deployment Runbook (Vercel + Supabase)

## 1) Prerequisites
- Vercel account (free)
- Supabase project
- Repository connected to Vercel

## 2) Environment Variables (Vercel Project Settings)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Use the same values as local `.env.local` (without quotes).

## 3) Database Migration
From your local repository:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Required migration for platform SaaS features:
- `supabase/migrations/202603290002_platform_multischool.sql`

## 4) Supabase Auth URLs
In Supabase Auth settings, add:
- Site URL: `https://<your-vercel-domain>`
- Redirect URLs:
  - `https://<your-vercel-domain>/`
  - `https://<your-vercel-domain>/login`

## 5) Deploy
- Push to `main` (or your production branch)
- Vercel auto-builds with `npm run build`
- Verify:
  - `/login`
  - `/admin`
  - `/teacher`
  - `/student`
  - `/platform` (for platform admins)

## 6) Post-Deploy Checks
- Create one school from `/platform`
- Verify new school admin can log in
- Assign Normal/Elite plan
- Record one payment entry and confirm revenue widgets update

## 7) Free-Tier Guardrails
- Vercel free tier has usage limits and cold starts
- Supabase free tier has database/storage limits
- Keep retention policies for logs and exports
