-- Multi-school platform foundations: subscriptions, branding, and payments.

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'user_role'::regtype
      and enumlabel = 'platform_admin'
  ) then
    alter type user_role add value 'platform_admin';
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_status') then
    create type organization_status as enum ('active', 'suspended', 'trial');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('trial', 'active', 'past_due', 'cancelled', 'suspended');
  end if;
end
$$;

alter table organizations
  add column if not exists code text,
  add column if not exists contact_email text,
  add column if not exists status organization_status;

alter table organizations
  alter column status set default 'active';

update organizations
set status = 'active'
where status is null;

alter table organizations
  alter column status set not null;

update organizations
set code = upper(left(md5(id::text), 12))
where code is null;

create unique index if not exists organizations_code_unique_idx
  on organizations (code)
  where code is not null;

create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monthly_price_pkr numeric(12, 2) not null check (monthly_price_pkr >= 0),
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
  amount_pkr numeric(12, 2) not null check (amount_pkr >= 0),
  starts_on date not null default current_date,
  ends_on date,
  seats integer not null default 500 check (seats > 0),
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
  amount_pkr numeric(12, 2) not null check (amount_pkr > 0),
  payment_date date not null default current_date,
  method text not null default 'bank_transfer',
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_organizations_status on organizations (status);
create index if not exists idx_org_subscription_org on organization_subscriptions (organization_id, status);
create index if not exists idx_org_subscription_plan on organization_subscriptions (plan_id);
create index if not exists idx_platform_payment_org_date on platform_payments (organization_id, payment_date);

create or replace function set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_org_subscriptions_updated_at on organization_subscriptions;
create trigger trg_org_subscriptions_updated_at
before update on organization_subscriptions
for each row
execute function set_timestamp_updated_at();

drop trigger if exists trg_org_branding_updated_at on organization_branding;
create trigger trg_org_branding_updated_at
before update on organization_branding
for each row
execute function set_timestamp_updated_at();

insert into subscription_plans (
  code,
  name,
  monthly_price_pkr,
  description,
  features,
  includes_personal_branding,
  active
)
values
  (
    'BASIC_3K',
    'Basic',
    3000,
    'Starter LMS access for one school.',
    '["Student and staff management","Attendance and grading","Core timetable and reports"]'::jsonb,
    false,
    true
  ),
  (
    'NORMAL_8K',
    'Normal',
    8000,
    'Growth plan with finance and workflow automation.',
    '["Everything in Basic","Fees and payroll workflows","Institution-level analytics and exports"]'::jsonb,
    false,
    true
  ),
  (
    'ELITE_12K',
    'Elite',
    12000,
    'Enterprise-grade plan with custom branding controls.',
    '["Everything in Normal","Personal branding profile","Custom color themes and priority support"]'::jsonb,
    true,
    true
  )
on conflict (code) do update set
  name = excluded.name,
  monthly_price_pkr = excluded.monthly_price_pkr,
  description = excluded.description,
  features = excluded.features,
  includes_personal_branding = excluded.includes_personal_branding,
  active = excluded.active;

insert into organization_branding (
  organization_id,
  brand_name
)
select
  o.id,
  o.name
from organizations o
where not exists (
  select 1
  from organization_branding ob
  where ob.organization_id = o.id
);

insert into organization_subscriptions (
  organization_id,
  plan_id,
  status,
  amount_pkr,
  starts_on,
  ends_on,
  seats,
  custom_branding_enabled
)
select
  o.id,
  p.id,
  'trial',
  p.monthly_price_pkr,
  current_date,
  current_date + interval '30 days',
  500,
  p.includes_personal_branding
from organizations o
cross join lateral (
  select id, monthly_price_pkr, includes_personal_branding
  from subscription_plans
  where code = 'BASIC_3K'
  limit 1
) p
where not exists (
  select 1
  from organization_subscriptions os
  where os.organization_id = o.id
);
