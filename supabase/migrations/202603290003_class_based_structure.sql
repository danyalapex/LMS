-- Class-based Learning Structure
-- Creates grade classes, class-based courses, and exam management

create type exam_type as enum ('unit_test', 'mid_semester', 'final_exam', 'quiz');
create type exam_status as enum ('scheduled', 'ongoing', 'completed', 'published');
create type notification_type as enum ('announcement', 'assignment', 'grade', 'attendance', 'exam', 'fee', 'system');
create type notification_status as enum ('sent', 'read', 'archived');

-- Grade Classes (e.g., Class 9, Class 10)
create table if not exists grade_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  section text, -- A, B, C, etc.
  class_teacher_user_id uuid references users(id) on delete set null,
  capacity integer not null default 50,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code, section)
);

-- Update students table to reference grade_classes
alter table if exists students add column if not exists grade_class_id uuid references grade_classes(id) on delete set null;
alter table if exists students add column if not exists father_name text;
alter table if exists students add column if not exists mother_name text;
alter table if exists students add column if not exists date_of_birth date;
alter table if exists students drop column if exists guardian_contact;

-- Class-based Courses (courses offered in a specific grade)
create table if not exists class_courses (
  id uuid primary key default gen_random_uuid(),
  grade_class_id uuid not null references grade_classes(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  teacher_user_id uuid not null references users(id) on delete restrict,
  credit_hours numeric(5, 2) not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade_class_id, code)
);

-- Exams and Tests
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  grade_class_id uuid not null references grade_classes(id) on delete cascade,
  course_id uuid references class_courses(id) on delete set null,
  exam_code text not null,
  title text not null,
  exam_type exam_type not null,
  status exam_status not null default 'scheduled',
  total_marks numeric(6, 2) not null,
  passing_marks numeric(6, 2),
  scheduled_date timestamptz not null,
  duration_minutes integer not null default 60,
  instructions text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, exam_code)
);

-- Exam Sheets (actual paper/test)
create table if not exists exam_sheets (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  marks_obtained numeric(6, 2),
  percentage numeric(5, 2),
  remarks text,
  submitted_at timestamptz,
  marked_by uuid references users(id) on delete set null,
  marked_at timestamptz,
  unique (exam_id, student_id)
);

-- Exam Result Sheet (overall view of student performance)
create table if not exists exam_result_sheets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  marks numeric(6, 2),
  grade_letter text, -- A, B, C, D, F
  comments text,
  created_at timestamptz not null default now(),
  unique (student_id, exam_id)
);

-- In-app Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recipient_user_id uuid not null references users(id) on delete cascade,
  notification_type notification_type not null,
  title text not null,
  message text not null,
  status notification_status not null default 'sent',
  related_entity text, -- exam_id, assignment_id, announcement_id, etc.
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references users(id) on delete set null
);

-- Update subscription plans table to include payment method
alter table if exists subscription_plans add column if not exists payment_method text not null default 'cash';

-- Create subscription payment tracking
create table if not exists subscription_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subscription_id uuid references organization_subscriptions(id) on delete cascade,
  amount_pkr numeric(12, 2) not null,
  payment_method text not null default 'cash', -- 'cash', 'bank_transfer', 'cheque'
  status text not null default 'pending', -- 'pending', 'completed', 'failed'
  reference_no text,
  notes text,
  due_date date not null,
  paid_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update guardian user info (allow more complete profile)
alter table if exists users add column if not exists date_of_birth date;
alter table if exists users add column if not exists national_id text;
alter table if exists users add column if not exists address text;
alter table if exists users add column if not exists city text;
alter table if exists users add column if not exists country text;

-- Update guardian_student_links to track multiple students per guardian
create table if not exists guardian_student_links_new (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  relation text not null default 'Guardian', -- Father, Mother, Sibling, Guardian, etc.
  created_at timestamptz not null default now(),
  unique (guardian_user_id, student_id)
);

-- Create indexes for performance
create index if not exists idx_grade_classes_org on grade_classes (organization_id);
create index if not exists idx_class_courses_grade_class on class_courses (grade_class_id);
create index if not exists idx_exams_org on exams (organization_id);
create index if not exists idx_exams_grade_class on exams (grade_class_id);
create index if not exists idx_notifications_recipient on notifications (recipient_user_id);
create index if not exists idx_notifications_created on notifications (created_at);
create index if not exists idx_subscription_payments_org on subscription_payments (organization_id);
