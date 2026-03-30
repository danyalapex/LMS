#!/usr/bin/env node
/**
 * create-arkali-admin.js
 * Usage (example):
 *
 * SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_... \
 * node scripts/create-arkali-admin.js --email syedalihasnat929@gmail.com --password 'SuCe)7192' --first-name Syed --last-name "Ali Hasnat"
 *
 * The script will:
 * - create an Auth user via Supabase Admin API
 * - create (or find) an organization named 'Arkali Solutions Academy' (unless --org-id provided)
 * - create an app `users` row linked to the Auth user
 * - grant `platform_admin` role in `user_role_assignments`
 *
 * WARNING: keep your SUPABASE_SERVICE_ROLE_KEY secret; do not commit it.
 */

const argv = process.argv.slice(2);
function parseArg(name) {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return null;
  const a = argv[i];
  if (a.includes('=')) return a.split('=')[1];
  return argv[i + 1] ?? null;
}

const email = parseArg('email');
const password = parseArg('password');
const firstName = parseArg('first-name') || 'Arkali';
const lastName = parseArg('last-name') || 'User';
const orgIdArg = parseArg('org-id') || null;
const orgName = parseArg('org-name') || 'Arkali Solutions Academy';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

if (!email || !password) {
  console.error('Please provide --email and --password.');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { ok: res.ok, status: res.status, data: text };
  }
}

async function createAuthUser() {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`;
  const body = { email, password, email_confirm: true };
  const r = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) {
    throw new Error(`Failed to create auth user: ${r.status} ${JSON.stringify(r.data)}`);
  }
  return r.data;
}

async function findOrCreateOrg() {
  if (orgIdArg) return orgIdArg;
  const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/organizations`;
  const queryUrl = `${restUrl}?name=eq.${encodeURIComponent(orgName)}`;
  const r = await fetchJson(queryUrl, { method: 'GET', headers });
  if (!r.ok) throw new Error(`Failed to query organizations: ${r.status} ${JSON.stringify(r.data)}`);
  if (Array.isArray(r.data) && r.data.length > 0) return r.data[0].id;

  // create
  const createRes = await fetchJson(restUrl, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ name: orgName, timezone: 'Asia/Karachi' }),
  });
  if (!createRes.ok) throw new Error(`Failed to create organization: ${createRes.status} ${JSON.stringify(createRes.data)}`);
  return createRes.data[0].id;
}

async function findOrCreateAppUser(authUserId, orgId) {
  const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users`;
  const query = `${restUrl}?auth_user_id=eq.${encodeURIComponent(authUserId)}`;
  const r = await fetchJson(query, { method: 'GET', headers });
  if (!r.ok) throw new Error(`Failed to query users: ${r.status} ${JSON.stringify(r.data)}`);
  if (Array.isArray(r.data) && r.data.length > 0) return r.data[0].id;

  const body = {
    organization_id: orgId,
    auth_user_id: authUserId,
    first_name: firstName,
    last_name: lastName,
    email,
  };

  const createRes = await fetchJson(restUrl, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body) });
  if (!createRes.ok) throw new Error(`Failed to create app user: ${createRes.status} ${JSON.stringify(createRes.data)}`);
  return createRes.data[0].id;
}

async function ensureRole(appUserId) {
  const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/user_role_assignments`;
  const query = `${restUrl}?user_id=eq.${encodeURIComponent(appUserId)}&role=eq.platform_admin`;
  const r = await fetchJson(query, { method: 'GET', headers });
  if (!r.ok) throw new Error(`Failed to query roles: ${r.status} ${JSON.stringify(r.data)}`);
  if (Array.isArray(r.data) && r.data.length > 0) return r.data[0].id;

  const createRes = await fetchJson(restUrl, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ user_id: appUserId, role: 'platform_admin' }) });
  if (!createRes.ok) throw new Error(`Failed to create role assignment: ${createRes.status} ${JSON.stringify(createRes.data)}`);
  return createRes.data[0].id;
}

async function run() {
  try {
    console.log('Creating Supabase auth user...');
    const authUser = await createAuthUser();
    const authUserId = authUser.id || authUser.user?.id || authUser?.user_id || authUser?.id;
    console.log('Auth user id:', authUserId);

    console.log('Finding or creating organization...');
    const orgId = await findOrCreateOrg();
    console.log('Organization id:', orgId);

    console.log('Creating or finding app user...');
    const appUserId = await findOrCreateAppUser(authUserId, orgId);
    console.log('App user id:', appUserId);

    console.log('Granting platform_admin role...');
    const roleId = await ensureRole(appUserId);
    console.log('Role assignment id:', roleId);

    console.log('\nDone. The user has been created and granted platform_admin.');
    console.log(`Email: ${email}`);
    console.log(`Temporary password: (the one you provided)`);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

run();
