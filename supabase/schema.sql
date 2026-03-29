-- Arkali Solutions LMS schema for Supabase PostgreSQL
-- Enable extension for UUID generation
create extension if not exists pgcrypto;

create type user_role as enum ('platform_admin', 'admin', 'teacher', 'student', 'guardian', 'finance');
create type attendance_state as enum ('present', 'absent', 'late', 'excused');
create type payroll_status as enum ('draft', 'pending_approval', 'approved', 'paid', 'rejected');
create type invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
create type organization_status as enum ('active', 'suspended', 'trial');
create type subscription_status as enum ('trial', 'active', 'past_due', 'cancelled', 'suspended');

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  contact_email text,
  status organization_status not null default 'active',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monthly_price_pkr numeric(12, 2) not null,
  description text,
  features jsonb not null default '[]'::jsonb,
  includes_personal_branding boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid not null references subscription_plans(id) on delete restrict,
  status subscription_status not null default 'active',
  amount_pkr numeric(12, 2) not null,
  starts_on date not null default current_date,
  ends_on date,
  seats integer not null default 500,
  custom_branding_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_branding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  brand_name text not null,
  logo_url text,
  primary_color text not null default '#4f46e5',
  secondary_color text not null default '#0f172a',
  accent_color text not null default '#16a34a',
  updated_at timestamptz not null default now()
);

create table if not exists platform_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subscription_id uuid references organization_subscriptions(id) on delete set null,
  amount_pkr numeric(12, 2) not null,
  payment_date date not null default current_date,
  method text not null default 'bank_transfer',
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  auth_user_id uuid unique,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role user_role not null,
  unique (user_id, role)
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  student_code text not null unique,
  grade_level text not null,
  admission_date date not null,
  guardian_contact jsonb,
  created_at timestamptz not null default now()
);

create table if not exists guardian_student_links (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  relation text not null default 'Guardian',
  created_at timestamptz not null default now(),
  unique (guardian_user_id, student_id)
);

create table if not exists staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  employee_code text not null unique,
  department text not null,
  designation text not null,
  hire_date date not null,
  monthly_salary numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  title text not null,
  grade_level text not null,
  teacher_user_id uuid references users(id) on delete set null,
  credit_hours numeric(5, 2) not null default 1,
  unique (organization_id, code)
);

create table if not exists timetable_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_code text not null,
  title text not null,
  start_time time not null,
  end_time time not null,
  sort_order integer not null default 1,
  unique (organization_id, period_code)
);

create table if not exists timetable_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  period_id uuid not null references timetable_periods(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 1 and 7),
  room_label text,
  teacher_user_id uuid references users(id) on delete set null,
  active boolean not null default true,
  unique (course_id, period_id, day_of_week)
);

create table if not exists course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  enrolled_on date not null default current_date,
  unique (course_id, student_id)
);

create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  session_date date not null,
  period_label text not null,
  teacher_user_id uuid references users(id) on delete set null,
  unique (course_id, session_date, period_label)
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  state attendance_state not null,
  remarks text,
  marked_at timestamptz not null default now(),
  unique (attendance_session_id, student_id)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  details text,
  max_score numeric(6, 2) not null,
  due_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  submitted_at timestamptz,
  content text,
  attachment_url text,
  unique (assignment_id, student_id)
);

create table if not exists grades (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  score numeric(6, 2) not null,
  feedback text,
  graded_by uuid references users(id) on delete set null,
  graded_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table if not exists payroll_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  cycle_code text not null,
  period_start date not null,
  period_end date not null,
  status payroll_status not null default 'draft',
  unique (organization_id, cycle_code)
);

create table if not exists payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_cycle_id uuid not null references payroll_cycles(id) on delete cascade,
  staff_profile_id uuid not null references staff_profiles(id) on delete cascade,
  gross_amount numeric(12, 2) not null,
  deductions numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) generated always as (gross_amount - deductions) stored,
  status payroll_status not null default 'pending_approval',
  processed_by uuid references users(id) on delete set null,
  processed_at timestamptz
);

create table if not exists fee_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_code text not null,
  title text not null,
  grade_level text not null,
  amount numeric(12, 2) not null,
  recurrence text not null default 'monthly',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, plan_code)
);

create table if not exists fee_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  fee_plan_id uuid references fee_plans(id) on delete set null,
  invoice_code text not null,
  title text not null,
  amount_due numeric(12, 2) not null,
  due_date date not null,
  status invoice_status not null default 'issued',
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_code)
);

create table if not exists fee_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references fee_invoices(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  amount_paid numeric(12, 2) not null,
  payment_date date not null default current_date,
  method text not null default 'cash',
  reference_no text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  body text not null,
  audience user_role[] not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_org on users (organization_id);
create index if not exists idx_organizations_status on organizations (status);
create index if not exists idx_students_grade on students (grade_level);
create index if not exists idx_guardian_links_guardian on guardian_student_links (guardian_user_id);
create index if not exists idx_timetable_entries_teacher_day on timetable_entries (teacher_user_id, day_of_week);
create index if not exists idx_timetable_entries_course_day on timetable_entries (course_id, day_of_week);
create index if not exists idx_attendance_student on attendance_records (student_id);
create index if not exists idx_grades_student on grades (student_id);
create index if not exists idx_payroll_cycle on payroll_entries (payroll_cycle_id);
create index if not exists idx_fee_plan_grade on fee_plans (grade_level, active);
create index if not exists idx_fee_invoice_student on fee_invoices (student_id, due_date);
create index if not exists idx_fee_invoice_status on fee_invoices (status);
create index if not exists idx_fee_payment_invoice on fee_payments (invoice_id, payment_date);
create index if not exists idx_org_subscription_org on organization_subscriptions (organization_id, status);
create index if not exists idx_org_subscription_plan on organization_subscriptions (plan_id);
create index if not exists idx_platform_payment_org_date on platform_payments (organization_id, payment_date);
create index if not exists idx_audit_org_created on audit_logs (organization_id, created_at desc);

alter table users enable row level security;
alter table students enable row level security;
alter table guardian_student_links enable row level security;
alter table staff_profiles enable row level security;
alter table timetable_periods enable row level security;
alter table timetable_entries enable row level security;
alter table attendance_records enable row level security;
alter table grades enable row level security;
alter table payroll_entries enable row level security;
alter table fee_plans enable row level security;
alter table fee_invoices enable row level security;
alter table fee_payments enable row level security;
alter table announcements enable row level security;

create policy "users can read own profile"
  on users for select
  using (auth.uid() = auth_user_id);

create policy "students can read own academic records"
  on grades for select
  using (
    exists (
      select 1
      from students s
      join users u on s.user_id = u.id
      where s.id = grades.student_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy "teachers and admins can manage grades"
  on grades for all
  using (
    exists (
      select 1
      from users u
      join user_role_assignments r on r.user_id = u.id
      where u.auth_user_id = auth.uid()
        and r.role in ('teacher', 'admin')
    )
  );

create policy "student can read own fee invoices"
  on fee_invoices for select
  using (
    exists (
      select 1
      from students s
      join users u on s.user_id = u.id
      where s.id = fee_invoices.student_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy "student can read own fee payments"
  on fee_payments for select
  using (
    exists (
      select 1
      from students s
      join users u on s.user_id = u.id
      where s.id = fee_payments.student_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy "finance and admins can manage fee modules"
  on fee_plans for all
  using (
    exists (
      select 1
      from users u
      join user_role_assignments r on r.user_id = u.id
      where u.auth_user_id = auth.uid()
        and r.role in ('finance', 'admin')
    )
  );

create policy "finance and admins can manage fee invoices"
  on fee_invoices for all
  using (
    exists (
      select 1
      from users u
      join user_role_assignments r on r.user_id = u.id
      where u.auth_user_id = auth.uid()
        and r.role in ('finance', 'admin')
    )
  );

create policy "finance and admins can manage fee payments"
  on fee_payments for all
  using (
    exists (
      select 1
      from users u
      join user_role_assignments r on r.user_id = u.id
      where u.auth_user_id = auth.uid()
        and r.role in ('finance', 'admin')
    )
  );

create policy "guardian can read linked student records"
  on guardian_student_links for select
  using (
    exists (
      select 1
      from users u
      where u.id = guardian_student_links.guardian_user_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy "authenticated can read timetable periods"
  on timetable_periods for select
  using (auth.uid() is not null);

create policy "authenticated can read timetable entries"
  on timetable_entries for select
  using (auth.uid() is not null);
