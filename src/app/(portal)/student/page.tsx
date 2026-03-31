import Link from "next/link";
import { requireIdentity, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listAnnouncements,
  listStudentAssignments,
  listStudentFeeLedger,
  listStudentGradebook,
} from "@/lib/lms/queries";
import {
  BrandedHeader,
  CourseCard,
  StatCardGlass,
  AnnouncementWidget,
  GlassCard,
} from "@/components/ui/glassmorphism-components";

export default async function StudentPage() {
  await requireRole(["student", "guardian"]);
  const identity = await requireIdentity();
  const admin = createSupabaseAdminClient();

  // Fetch organization branding and subscription info
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, branding_colors, status")
    .eq("id", identity.organizationId)
    .maybeSingle();

  const { data: subscription } = await admin
    .from("organization_subscriptions")
    .select("id, status, ends_on")
    .eq("organization_id", identity.organizationId)
    .eq("status", "active")
    .maybeSingle();

  const [gradebook, assignments, feeLedger, announcements] = await Promise.all([
    listStudentGradebook(identity.authUserId),
    listStudentAssignments(identity.authUserId),
    listStudentFeeLedger(identity.authUserId),
    listAnnouncements(),
  ]);

  const pendingAssignments = assignments.filter(
    (row) => row.status === "pending" || row.status === "overdue",
  ).length;
  const outstandingFees = feeLedger.reduce((sum, row) => sum + row.balance, 0);

  const averageScore =
    gradebook.length > 0
      ? (
          gradebook.reduce((sum, row) => sum + Number(row.score), 0) /
          gradebook.length
        ).toFixed(2)
      : "0.00";

  const isPremium = subscription?.status === "active";
  const schoolName = org?.name || "My School";

  // Sample course cards (in a real app, fetch from courses table)
  const courses = [
    {
      courseName: "Mathematics 101",
      instructor: "Dr. Sarah Johnson",
      progress: 75,
      upcomingDeadline: "Tomorrow",
      badge: "today" as const,
    },
    {
      courseName: "English Literature",
      instructor: "Prof. Michael Chen",
      progress: 60,
      upcomingDeadline: "Next Monday",
      badge: undefined,
    },
    {
      courseName: "Physics Advanced",
      instructor: "Dr. Elena Rodriguez",
      progress: 85,
      upcomingDeadline: "Mar 15",
      badge: "completed" as const,
    },
  ];

  const announcementsList = announcements.map((ann) => ({
    id: ann.id,
    title: ann.title,
    date: new Date(ann.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    isPinned: false,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <style>{`
        :root {
          --brand-primary: ${org?.branding_colors?.primary || "#2563eb"};
          --brand-accent: ${org?.branding_colors?.accent || "#7c3aed"};
        }
      `}</style>

      {/* Branded Header */}
      <BrandedHeader
        schoolName={schoolName}
        studentName={identity.fullName}
        isPremium={isPremium}
      />

      {/* Quick Stats */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCardGlass
          icon="📊"
          label="Average Score"
          value={averageScore}
          trend="Your academic performance"
          trendPositive={Number(averageScore) >= 70}
        />
        <StatCardGlass
          icon="✅"
          label="Assessments"
          value={String(gradebook.length)}
          trend="Submitted & graded"
          trendPositive={true}
        />
        <StatCardGlass
          icon="📝"
          label="Pending Tasks"
          value={String(pendingAssignments)}
          trend="Awaiting submission"
          trendPositive={pendingAssignments === 0}
        />
        <StatCardGlass
          icon="💰"
          label="Outstanding Fees"
          value={`${outstandingFees.toFixed(0)}`}
          trend="Current balance"
          trendPositive={outstandingFees === 0}
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3 mb-8">
        {/* Courses Section - 2 columns */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-white mb-6">📚 My Courses</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course, idx) => (
              <CourseCard key={idx} {...course} />
            ))}
          </div>
        </div>

        {/* Announcements - 1 column */}
        <AnnouncementWidget announcements={announcementsList} />
      </div>

      {/* Recent Grades */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">🏆 Latest Grades</h2>
          <div className="flex gap-3">
            <Link
              href="/student/grades"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All
            </Link>
            <Link
              href="/student/assignments"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Assignments
            </Link>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {gradebook.slice(0, 6).map((entry) => (
            <GlassCard key={entry.id}>
              <p className="text-white font-semibold text-sm">{entry.assignment_title}</p>
              <p className="text-white/60 text-xs mt-2">{entry.course_code}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-blue-300">
                  {entry.score}/{entry.assignment_max_score}
                </span>
                <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full">
                  {((Number(entry.score) / Number(entry.assignment_max_score)) * 100).toFixed(0)}%
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid gap-4 md:grid-cols-4">
        <Link href="/student/grades">
          <GlassCard className="text-center cursor-pointer">
            <p className="text-3xl mb-2">📖</p>
            <p className="text-white font-semibold">Gradebook</p>
          </GlassCard>
        </Link>
        <Link href="/student/timetable">
          <GlassCard className="text-center cursor-pointer">
            <p className="text-3xl mb-2">⏱️</p>
            <p className="text-white font-semibold">Timetable</p>
          </GlassCard>
        </Link>
        <Link href="/student/fees">
          <GlassCard className="text-center cursor-pointer">
            <p className="text-3xl mb-2">💳</p>
            <p className="text-white font-semibold">Fee Status</p>
          </GlassCard>
        </Link>
        <Link href="/student/announcements">
          <GlassCard className="text-center cursor-pointer">
            <p className="text-3xl mb-2">📢</p>
            <p className="text-white font-semibold">Announcements</p>
          </GlassCard>
        </Link>
      </section>
    </div>
  );
}
