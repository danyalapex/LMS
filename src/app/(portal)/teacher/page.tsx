import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { requireIdentity, requireRole } from "@/lib/auth";
import {
  listAnnouncements,
  listCoursesForTeacher,
  listTeacherAssignments,
  listTeacherSubmissionQueue,
} from "@/lib/lms/queries";

export default async function TeacherPage() {
  await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const [courses, assignments, submissions, announcements] = await Promise.all([
    listCoursesForTeacher(identity.authUserId),
    listTeacherAssignments(identity.authUserId),
    listTeacherSubmissionQueue(identity.authUserId),
    listAnnouncements(),
  ]);
  const ungradedQueue = submissions.filter((row) => row.grade_score === null).length;

  const stats = [
    {
      label: "Assigned Courses",
      value: String(courses.length),
      trend: "Courses mapped to your profile",
      tone: "good" as const,
    },
    {
      label: "Assignments Created",
      value: String(assignments.length),
      trend: "Recent graded activities",
      tone: "neutral" as const,
    },
    {
      label: "Ungraded Queue",
      value: String(ungradedQueue),
      trend: "Submissions awaiting teacher review",
      tone: "warn" as const,
    },
    {
      label: "Announcements",
      value: String(announcements.length),
      trend: "Latest institution updates",
      tone: "good" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">My Courses</h2>
            <div className="flex gap-3">
              <Link href="/teacher/attendance" className="text-sm font-semibold text-slate-700 underline">
                Take Attendance
              </Link>
              <Link href="/teacher/timetable" className="text-sm font-semibold text-slate-700 underline">
                Timetable
              </Link>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {courses.map((course) => (
              <div key={course.id} className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
                <p className="text-sm font-semibold">{course.code} - {course.title}</p>
                <p className="text-xs text-slate-600">Grade {course.grade_level}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Recent Assignments</h2>
            <div className="flex gap-3">
              <Link href="/teacher/grades" className="text-sm font-semibold text-slate-700 underline">
                Gradeboard
              </Link>
              <Link href="/teacher/submissions" className="text-sm font-semibold text-slate-700 underline">
                Submissions
              </Link>
              <Link href="/teacher/announcements" className="text-sm font-semibold text-slate-700 underline">
                Announcements
              </Link>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {assignments.slice(0, 8).map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
                <p className="text-sm font-semibold">{assignment.title}</p>
                <p className="text-xs text-slate-600">
                  {assignment.course_code} | Max {assignment.max_score}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
