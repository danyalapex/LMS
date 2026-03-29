import { requireIdentity, requireRole } from "@/lib/auth";
import { listTeacherTimetable } from "@/lib/lms/queries";
import { dayLabel } from "@/lib/lms/schedule";

export default async function TeacherTimetablePage() {
  await requireRole(["teacher", "admin"]);
  const identity = await requireIdentity();

  const timetable = await listTeacherTimetable(identity.authUserId);

  return (
    <div className="space-y-4">
      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">My Weekly Timetable</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Day</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3">Room</th>
              </tr>
            </thead>
            <tbody>
              {timetable.map((entry) => (
                <tr key={entry.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3">{dayLabel(entry.day_of_week)}</td>
                  <td className="px-5 py-3 font-semibold">{entry.period_code}</td>
                  <td className="px-5 py-3">
                    {entry.period_start_time} - {entry.period_end_time}
                  </td>
                  <td className="px-5 py-3">
                    {entry.course_code} - {entry.course_title}
                  </td>
                  <td className="px-5 py-3">{entry.course_grade_level}</td>
                  <td className="px-5 py-3">{entry.room_label || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
