import Link from "next/link";
import { createAnnouncementAction, createCourseAction } from "@/app/actions/lms";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth";
import {
  getFeeCollectionSummaryReport,
  getAdminOverviewData,
  listAnnouncements,
  listStaffProfiles,
  listStudents,
} from "@/lib/lms/queries";

export default async function AdminPage() {
  await requireRole(["admin", "finance"]);

  const [overview, feeSummary, students, staff, announcements] = await Promise.all([
    getAdminOverviewData(),
    getFeeCollectionSummaryReport(),
    listStudents(),
    listStaffProfiles(),
    listAnnouncements(),
  ]);
  const outstandingFees = feeSummary.reduce(
    (sum, row) => sum + row.outstanding_amount,
    0,
  );

  const stats = [
    {
      label: "Active Students",
      value: String(overview.studentCount),
      trend: "Current enrolled student profiles",
      tone: "good" as const,
    },
    {
      label: "Active Staff",
      value: String(overview.staffCount),
      trend: "Registered teacher and finance profiles",
      tone: "neutral" as const,
    },
    {
      label: "Pending Payroll",
      value: String(overview.pendingPayrollCount),
      trend: "Entries awaiting approval",
      tone: "warn" as const,
    },
    {
      label: "Attendance Sessions Today",
      value: String(overview.attendanceTodayCount),
      trend: "Recorded sessions for today",
      tone: "good" as const,
    },
    {
      label: "Outstanding Fees",
      value: `$${outstandingFees.toFixed(2)}`,
      trend: "Uncollected billed amount",
      tone: outstandingFees > 0 ? ("warn" as const) : ("good" as const),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Student Roster Snapshot</h2>
            <Link className="text-sm font-semibold text-slate-700 underline" href="/admin/students">
              Open Students
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {students.slice(0, 6).map((student) => (
              <div key={student.id} className="rounded-xl border border-[color:var(--border)] bg-white/80 px-3 py-2">
                <p className="text-sm font-semibold">
                  {student.first_name} {student.last_name}
                </p>
                <p className="text-xs text-slate-600">
                  {student.student_code} | Grade {student.grade_level}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Staff Snapshot</h2>
            <Link className="text-sm font-semibold text-slate-700 underline" href="/admin/staff">
              Open Staff
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {staff.slice(0, 6).map((member) => (
              <div key={member.id} className="rounded-xl border border-[color:var(--border)] bg-white/80 px-3 py-2">
                <p className="text-sm font-semibold">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-xs text-slate-600">
                  {member.department} | {member.designation}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Create Course</h2>
            <Link className="text-sm font-semibold text-slate-700 underline" href="/admin/timetable">
              Timetable
            </Link>
          </div>
          <form action={createCourseAction} className="mt-3 space-y-2">
            <input name="code" placeholder="Course code (e.g., PHY-101)" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <input name="title" placeholder="Course title" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <input name="grade_level" placeholder="Grade level" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <button type="submit" className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              Create Course
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Broadcast Announcement</h2>
            <Link className="text-sm font-semibold text-slate-700 underline" href="/admin/notifications">
              Notification Center
            </Link>
          </div>
          <form action={createAnnouncementAction} className="mt-3 space-y-2">
            <input name="title" placeholder="Announcement title" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <textarea name="body" placeholder="Message details" rows={4} className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" required />
            <input name="audience" placeholder="Audience roles comma-separated (student,teacher,admin)" className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm" />
            <button type="submit" className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Publish
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {announcements.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
