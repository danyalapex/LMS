-- Seed test users for development
-- Note: In production, admins should be created through a proper UI with strong passwords

-- Test Platform Admin
-- Email: platform@arkali.com / Password: Platform@123
insert into users (id, organization_id, auth_user_id, first_name, last_name, email, status)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'auth-platform-admin', 'Arkali', 'Platform', 'platform@arkali.com', 'active')
on conflict (id) do nothing;

insert into user_role_assignments (user_id, role)
values ('22222222-2222-2222-2222-222222222222', 'platform_admin')
on conflict (user_id, role) do nothing;

-- Test School Admin
-- Email: admin@arkali.com / Password: Admin@123
insert into users (id, organization_id, auth_user_id, first_name, last_name, email, status)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'auth-admin', 'School', 'Admin', 'admin@arkali.com', 'active')
on conflict (id) do nothing;

insert into user_role_assignments (user_id, role)
values ('33333333-3333-3333-3333-333333333333', 'admin')
on conflict (user_id, role) do nothing;

-- Test Finance Officer
-- Email: finance@arkali.com / Password: Finance@123
insert into users (id, organization_id, auth_user_id, first_name, last_name, email, status)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'auth-finance', 'Finance', 'Officer', 'finance@arkali.com', 'active')
on conflict (id) do nothing;

insert into user_role_assignments (user_id, role)
values ('44444444-4444-4444-4444-444444444444', 'finance')
on conflict (user_id, role) do nothing;
