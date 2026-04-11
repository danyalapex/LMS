-- Multi-school grading, fee, and payment configuration foundation

create table if not exists organization_grading_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  policy_name text not null,
  pass_mark numeric(5, 2) not null default 50,
  decimal_precision integer not null default 2,
  is_default boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_org_default_grading_policy
  on organization_grading_policies (organization_id)
  where is_default = true;

create table if not exists grading_scale_bands (
  id uuid primary key default gen_random_uuid(),
  grading_policy_id uuid not null references organization_grading_policies(id) on delete cascade,
  band_label text not null,
  min_percentage numeric(5, 2) not null,
  max_percentage numeric(5, 2) not null,
  grade_points numeric(4, 2),
  remarks text,
  sort_order integer not null default 1
);

create index if not exists idx_grading_scale_bands_policy
  on grading_scale_bands (grading_policy_id, sort_order);

alter table if exists grades add column if not exists percentage numeric(6, 2);
alter table if exists grades add column if not exists letter_grade text;
alter table if exists grades add column if not exists grade_points numeric(4, 2);
alter table if exists grades add column if not exists grading_policy_id uuid references organization_grading_policies(id) on delete set null;

create table if not exists organization_fee_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  currency_code text not null default 'PKR',
  allow_partial_payments boolean not null default true,
  late_fee_grace_days integer not null default 0,
  late_fee_flat_amount numeric(12, 2) not null default 0,
  receipt_prefix text not null default 'RCPT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_payment_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  method_code text not null,
  label text not null,
  instructions text,
  enabled boolean not null default true,
  account_details jsonb not null default '{}'::jsonb,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  unique (organization_id, method_code)
);

create index if not exists idx_org_payment_methods_org
  on organization_payment_methods (organization_id, enabled, sort_order);

insert into organization_fee_settings (
  organization_id,
  currency_code,
  allow_partial_payments,
  late_fee_grace_days,
  late_fee_flat_amount,
  receipt_prefix
)
select
  organizations.id,
  'PKR',
  true,
  0,
  0,
  'RCPT'
from organizations
on conflict (organization_id) do nothing;

insert into organization_payment_methods (
  organization_id,
  method_code,
  label,
  instructions,
  enabled,
  sort_order
)
select
  organizations.id,
  defaults.method_code,
  defaults.label,
  defaults.instructions,
  true,
  defaults.sort_order
from organizations
cross join (
  values
    ('cash', 'Cash', 'Record cash collected at front desk or finance office.', 1),
    ('bank_transfer', 'Bank transfer', 'Collect transfer slip or bank reference before approval.', 2),
    ('card', 'Card', 'Use for POS or school office card collections.', 3),
    ('online', 'Online payment', 'Use for gateway or wallet-based school collections.', 4)
) as defaults(method_code, label, instructions, sort_order)
on conflict (organization_id, method_code) do nothing;

insert into organization_grading_policies (
  organization_id,
  policy_name,
  pass_mark,
  decimal_precision,
  is_default
)
select
  organizations.id,
  'Default percentage scale',
  50,
  2,
  true
from organizations
where not exists (
  select 1
  from organization_grading_policies policies
  where policies.organization_id = organizations.id
    and policies.is_default = true
);

insert into grading_scale_bands (
  grading_policy_id,
  band_label,
  min_percentage,
  max_percentage,
  grade_points,
  remarks,
  sort_order
)
select
  policies.id,
  defaults.band_label,
  defaults.min_percentage,
  defaults.max_percentage,
  defaults.grade_points,
  defaults.remarks,
  defaults.sort_order
from organization_grading_policies policies
cross join (
  values
    ('A', 90::numeric, 100::numeric, 4::numeric, 'Excellent', 1),
    ('B', 80::numeric, 89.99::numeric, 3::numeric, 'Very good', 2),
    ('C', 70::numeric, 79.99::numeric, 2::numeric, 'Good', 3),
    ('D', 60::numeric, 69.99::numeric, 1::numeric, 'Pass', 4),
    ('F', 0::numeric, 59.99::numeric, 0::numeric, 'Needs support', 5)
) as defaults(
  band_label,
  min_percentage,
  max_percentage,
  grade_points,
  remarks,
  sort_order
)
where policies.is_default = true
  and not exists (
    select 1
    from grading_scale_bands bands
    where bands.grading_policy_id = policies.id
  );
