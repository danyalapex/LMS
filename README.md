# Arkali Solutions LMS - Elite Edition

Modern full-scope LMS platform built with Next.js + Supabase for free deployment on Vercel and managed PostgreSQL on Supabase.

## 🆕 New Elite Features (March 2026)

### Class-Based Learning System
- Grade class management (Class 9, Class 10, etc.)
- Class-specific courses with teacher assignment
- Integrated course scheduling within classes
- Class capacity management

### Comprehensive Exam Management
- Multiple exam types (unit tests, mid-semester, final exams, quizzes)
- Exam scheduling with duration tracking
- Student exam sheets for submissions
- Automatic grade calculation
- Pass/fail marking configuration
- Result publishing workflow

### Guardian Registration & Auto-Linking
- Enhanced signup with complete information collection
- Three registration modes: Student Only, Guardian Only, Both
- Auto-linking of guardian to student during joint signup
- Family profile management with father/mother names
- Guardian relationship tracking (Father, Mother, Uncle, Aunt, Guardian)

### In-App Notification System
- Real-time notifications for key events
- 7 notification types (announcement, assignment, grade, attendance, exam, fee, system)
- Read/unread status tracking
- Bulk notification capability
- Notification archive and management

### Premium Subscription Payment System
- Multiple payment methods:
  - **Cash** (immediate completion)
  - **Bank Transfer** (pending status, ready for API integration)
  - **Cheque** (manual verification)
- Payment tracking and statistics
- Outstanding payment management
- Bank API infrastructure ready
- Payment reference and note support

### Premium/Elite UI Components
- Gradient-based modern design
- 11+ premium components (buttons, cards, inputs, alerts, badges)
- Responsive grid layouts
- Enhanced form controls with validation
- Professional notification bells
- Loading spinners and dividers

## Implemented Modules

### Core Features
- Supabase authentication (signup/signin/signout)
- Role-based identity and route protection (`platform_admin`, `admin`, `finance`, `teacher`, `student`, `guardian`)
- Role-aware portal shell and navigation
- Extended user profiles (DOB, national ID, address, city)
- Platform module (multi-school SaaS control):
  - School onboarding (create school + school admin login from UI)
  - Subscription plans and assignment
  - PKR pricing tiers (`Basic 3K`, `Normal 8K`, `Elite 12K`)
  - Elite branding controls (brand name + theme colors)
  - School access controls (active/trial/suspended)
  - Platform payment ledger and income dashboard (MRR + total collections)
- Admin modules:
  - Dashboard with live institution metrics
  - Student registration and directory
  - Staff registration and directory
  - Course catalog, teacher assignment, and student enrollment
  - Timetable period + weekly slot management
  - Guardian-student linking
  - Fee plan management, student invoicing, payment recording
  - Payroll cycle and payroll entry management
  - Approval workflows for payroll entries/cycles with audit stream
  - Institution-wide notifications
  - Reports dashboard with CSV exports (course performance, payroll, fee collection)
- Teacher modules:
  - Dashboard with assigned courses and assignments
  - Attendance marking workflow
  - Assignment creation and grade recording workflow
  - Submission review queue with inline grading
  - Weekly timetable view
  - Announcements feed
- Student modules:
  - Dashboard with grade summary and announcements
  - Fee ledger with billed/paid/outstanding tracking
  - Assignment submission center with status tracking (pending/submitted/overdue/graded)
  - Full gradebook view
  - Attendance history
  - Weekly timetable view
  - Announcements feed
- Guardian module:
  - Linked student summary view (grades + attendance counts)
- Supabase schema and seed setup in `supabase/`

## Local development
1. Install dependencies:
```bash
npm install
```
2. Configure environment:
```bash
cp .env.example .env.local
```
3. Run dev server:
```bash
npm run dev
```
4. Open `http://localhost:3000`

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (preferred)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (supported fallback)
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase setup
1. Create Supabase project
2. Apply migrations (recommended):
```bash
npx supabase db push --linked
```
3. Optionally run `supabase/seed.sql`
4. Start registering users from `/login`

For environments on older versions, ensure these migrations are included:
- `supabase/migrations/202603290001_fees_module.sql`
- `supabase/migrations/202603290002_platform_multischool.sql`

If your local CLI is not linked yet:
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## Platform admin bootstrap
Self-signup for `platform_admin` is intentionally blocked.

Create an initial platform admin by assigning the role in SQL after signup:
```sql
insert into user_role_assignments (user_id, role)
select u.id, 'platform_admin'::user_role
from users u
where u.email = 'you@example.com'
on conflict (user_id, role) do nothing;
```

## Deploy on Vercel (free)
1. Push repo to GitHub/GitLab
2. Import project into Vercel
3. Add environment variables
4. Deploy
5. In Vercel, set build command `npm run build` and output defaults
6. Add production auth redirect URL in Supabase:
   - `https://<your-vercel-domain>/`
   - `https://<your-vercel-domain>/login`

## Elite Features Documentation

### Quick Start
1. See [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) for step-by-step setup
2. Install date-fns: `npm install date-fns`
3. Run migration: `npx supabase db push`
4. Test new signup at `/signup`

### Complete Documentation
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Overview of all new features
- **[docs/elite-features.md](docs/elite-features.md)** - Comprehensive guide with:
  - Feature documentation
  - Usage examples
  - Database schema
  - Component examples
  - Bank API integration guide
  - Troubleshooting

### Key Files
- **Database**: `supabase/migrations/202603290003_class_based_structure.sql`
- **Signup**: `src/app/signup/page.tsx` (redesigned with guardian registration)
- **Notifications**: `src/app/actions/notifications.ts` + `src/lib/notifications/queries.ts`
- **Payments**: `src/app/actions/subscriptions.ts` + `src/components/subscriptions/`
- **Premium UI**: `src/components/ui/premium-components.tsx`
- **Environment**: `.env.example` (updated with new variables)

## Next delivery blocks (toward full production)
- ✅ Class-based course structure (DONE)
- ✅ Mid/final exams and test marking (DONE)
- ✅ Guardian auto-linking during signup (DONE)
- ✅ In-app notifications (DONE)
- ✅ Premium UI components (DONE)
- ✅ Subscription payment management (DONE)
- Bulk operations (attendance, grading, payroll batch)
- Email notifications (infrastructure ready)
- SMS notifications for Pakistan
- Timetable and scheduling automation
- Advanced report engine and PDF exports
- Audit and comprehensive dashboards
- End-to-end tests and CI pipeline
<!-- vercel-deploy-trigger: 2026-04-12 -->
