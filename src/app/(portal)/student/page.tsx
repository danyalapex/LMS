import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { requireIdentity, requireRole } from "@/lib/auth";
import {
  listAnnouncements,
  listStudentAssignments,
  listStudentFeeLedger,
  listStudentGradebook,
} from "@/lib/lms/queries";

export default async function StudentPage() {
  await requireRole(["student", "guardian"]);
  const identity = await requireIdentity();

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

  const stats = [
    {
      label: "Scored Assessments",
      value: String(gradebook.length),
      trend: "Submitted and graded assignments",
      tone: "good" as const,
    },
    {
      label: "Average Score",
      value: averageScore,
      trend: "Across graded activities",
      tone: "good" as const,
    },
    {
      label: "Pending Assignments",
      value: String(pendingAssignments),
      trend: "Tasks awaiting submission",
      tone: pendingAssignments > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      label: "Outstanding Fees",
      value: `$${outstandingFees.toFixed(2)}`,
      trend: "Current balance in your fee ledger",
      tone: outstandingFees > 0 ? ("warn" as const) : ("good" as const),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">My Latest Grades</h2>
            <div className="flex gap-3">
              <Link href="/student/grades" className="text-sm font-semibold text-slate-700 underline">
                Gradebook
              </Link>
              <Link href="/student/timetable" className="text-sm font-semibold text-slate-700 underline">
                Timetable
              </Link>
              <Link href="/student/assignments" className="text-sm font-semibold text-slate-700 underline">
                Assignments
              </Link>
              <Link href="/student/fees" className="text-sm font-semibold text-slate-700 underline">
                Fees
              </Link>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {gradebook.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
                <p className="text-sm font-semibold">{entry.assignment_title}</p>
                <p className="text-xs text-slate-600">
                  {entry.course_code} | {entry.score}/{entry.assignment_max_score}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Announcements</h2>
            <Link href="/student/announcements" className="text-sm font-semibold text-slate-700 underline">
              Open All
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {announcements.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
