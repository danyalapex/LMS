const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupSchoolAdmin() {
  try {
    // 1. Create organization (school)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Arkali Solutions Academy',
        code: 'ASA',
        contact_email: 'admin@arkali-academy.local',
        status: 'active',
        timezone: 'UTC'
      })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log('✓ School created:', org.name, 'ID:', org.id);

    // 2. Create auth user
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email: 'academy-admin@arkali-academy.local',
      password: 'AcademyAdmin123!',
      email_confirm: true
    });

    if (authError) throw authError;
    console.log('✓ Auth user created:', user.user.email);

    // 3. Create app user
    const { data: appUser, error: appError } = await supabase
      .from('users')
      .insert({
        auth_user_id: user.user.id,
        organization_id: org.id,
        first_name: 'Academy',
        last_name: 'Admin',
        email: 'academy-admin@arkali-academy.local'
      })
      .select()
      .single();

    if (appError) throw appError;
    console.log('✓ App user created');

    // 4. Assign admin role
    const { error: roleError } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: appUser.id,
        role: 'admin'
      });

    if (roleError) throw roleError;
    console.log('✓ Admin role assigned');

    console.log('\n✅ SCHOOL ADMIN ACCOUNT CREATED:');
    console.log('=====================================');
    console.log('Email:    academy-admin@arkali-academy.local');
    console.log('Password: AcademyAdmin123!');
    console.log('School:   Arkali Solutions Academy');
    console.log('Role:     Institution Admin');
    console.log('=====================================');
    console.log('\nAccess at: http://localhost:3000/login');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setupSchoolAdmin();
