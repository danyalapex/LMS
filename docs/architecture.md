# Arkali LMS Architecture (Phase 1)

## Stack
- Next.js App Router (single deploy target on Vercel free tier)
- TypeScript + Tailwind CSS 4
- Supabase PostgreSQL + Auth + Storage

## Core Personas
- Platform Admin: manages schools, subscriptions, branding, and platform revenue
- Admin: payroll, staff operations, role governance, reports
- Teacher: attendance, gradebook, assignments, parent communication
- Student: progress tracking, timelines, grades, attendance

## Domain Modules
- Multi-School Platform: tenant onboarding, subscription billing, school status controls, branding
- Identity and Access: user profile, role assignments, permissions
- Student Lifecycle: admission, guardian profile, enrollment, promotion
- Staff and Payroll: contracts, payroll cycles, deductions, payouts
- Fees and Billing: fee plans, invoice issuance, payment ledger, collection reports
- Academic Operations: courses, sections, assignments, gradebook, GPA
- Attendance Engine: session creation, roll call, alerts, analytics
- Communication: announcements, notifications, parent updates
- Audit and Compliance: immutable logs, policy history, exports

## Delivery Plan
1. Replace demo role-login with Supabase Auth session handling
2. Build CRUD APIs/server-actions for students, staff, attendance, grades
3. Add payroll workflows (approval, cycle lock, pay-slip exports)
4. Add role-level policies via Supabase RLS and app-level checks
5. Add reporting dashboards and scheduled notifications

## Deployment
- Frontend + server actions on Vercel
- Database/Auth on Supabase
- Environment variables configured in Vercel project settings
