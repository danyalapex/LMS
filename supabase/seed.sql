-- Starter data for local development
insert into organizations (id, name, timezone)
values ('11111111-1111-1111-1111-111111111111', 'Arkali Solutions Academy', 'Asia/Karachi')
on conflict (id) do nothing;

insert into timetable_periods (
  organization_id,
  period_code,
  title,
  start_time,
  end_time,
  sort_order
)
values
  ('11111111-1111-1111-1111-111111111111', 'P1', 'Period 1', '08:00', '08:45', 1),
  ('11111111-1111-1111-1111-111111111111', 'P2', 'Period 2', '08:50', '09:35', 2),
  ('11111111-1111-1111-1111-111111111111', 'P3', 'Period 3', '09:40', '10:25', 3),
  ('11111111-1111-1111-1111-111111111111', 'P4', 'Period 4', '10:40', '11:25', 4),
  ('11111111-1111-1111-1111-111111111111', 'P5', 'Period 5', '11:30', '12:15', 5),
  ('11111111-1111-1111-1111-111111111111', 'P6', 'Period 6', '12:20', '13:05', 6)
on conflict (organization_id, period_code) do nothing;

insert into fee_plans (
  organization_id,
  plan_code,
  title,
  grade_level,
  amount,
  recurrence,
  active
)
values
  ('11111111-1111-1111-1111-111111111111', 'FEE-GENERAL-MONTHLY', 'General Tuition', 'All', 12500, 'monthly', true)
on conflict (organization_id, plan_code) do nothing;
