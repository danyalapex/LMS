-- Incremental migration: Fees and Billing module
-- Safe to run on databases that already have the core LMS schema.

do $$
begin
  create type invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

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

create index if not exists idx_fee_plan_grade on fee_plans (grade_level, active);
create index if not exists idx_fee_invoice_student on fee_invoices (student_id, due_date);
create index if not exists idx_fee_invoice_status on fee_invoices (status);
create index if not exists idx_fee_payment_invoice on fee_payments (invoice_id, payment_date);

alter table fee_plans enable row level security;
alter table fee_invoices enable row level security;
alter table fee_payments enable row level security;

drop policy if exists "student can read own fee invoices" on fee_invoices;
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

drop policy if exists "student can read own fee payments" on fee_payments;
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

drop policy if exists "finance and admins can manage fee modules" on fee_plans;
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

drop policy if exists "finance and admins can manage fee invoices" on fee_invoices;
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

drop policy if exists "finance and admins can manage fee payments" on fee_payments;
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
