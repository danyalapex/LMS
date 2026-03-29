import {
  createTimetableEntryAction,
  createTimetablePeriodAction,
} from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import {
  listAllCourses,
  listTeacherUsers,
  listTimetableEntries,
  listTimetablePeriods,
} from "@/lib/lms/queries";
import { DAY_OPTIONS, dayLabel } from "@/lib/lms/schedule";

export default async function AdminTimetablePage() {
  await requireRole(["admin"]);

  const [periods, entries, courses, teachers] = await Promise.all([
    listTimetablePeriods(),
    listTimetableEntries(),
    listAllCourses(),
    listTeacherUsers(),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="section-heading">Create Timetable Period</h2>
          <form action={createTimetablePeriodAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              name="period_code"
              placeholder="Code (e.g., P1)"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="title"
              placeholder="Period title"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="start_time"
              type="time"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="end_time"
              type="time"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              name="sort_order"
              type="number"
              min="1"
              defaultValue="1"
              placeholder="Sort order"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Add Period
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <h2 className="section-heading">Assign Weekly Slot</h2>
          <form action={createTimetableEntryAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              name="course_id"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>

            <select
              name="period_id"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            >
              <option value="">Select period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.period_code} ({period.start_time}-{period.end_time})
                </option>
              ))}
            </select>

            <select
              name="day_of_week"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
              required
            >
              {DAY_OPTIONS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>

            <select
              name="teacher_user_id"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            >
              <option value="">Unassigned teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.user_id} value={teacher.user_id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>

            <input
              name="room_label"
              placeholder="Room (optional)"
              className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="rounded-xl border border-[color:var(--border)] bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Save Slot
            </button>
          </form>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Defined Periods</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Order</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold">{period.period_code}</td>
                  <td className="px-5 py-3">{period.title}</td>
                  <td className="px-5 py-3">
                    {period.start_time} - {period.end_time}
                  </td>
                  <td className="px-5 py-3">{period.sort_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Weekly Timetable Slots</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Day</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Teacher</th>
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-[color:var(--border)]">
                  <td className="px-5 py-3">{dayLabel(entry.day_of_week)}</td>
                  <td className="px-5 py-3 font-semibold">{entry.period_code}</td>
                  <td className="px-5 py-3">
                    {entry.course_code} - {entry.course_title}
                  </td>
                  <td className="px-5 py-3">{entry.teacher_name}</td>
                  <td className="px-5 py-3">{entry.room_label || "-"}</td>
                  <td className="px-5 py-3">{entry.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
