import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  getCoursePerformanceReport,
  getFeeCollectionSummaryReport,
  getInstitutionReportSnapshot,
  getPayrollCycleSummaryReport,
} from "@/lib/lms/queries";

export default async function AdminReportsPage() {
  await requireRole(["admin", "finance"]);

  const [snapshot, coursePerformance, payrollSummary, feeSummary] = await Promise.all([
    getInstitutionReportSnapshot(),
    getCoursePerformanceReport(),
    getPayrollCycleSummaryReport(),
    getFeeCollectionSummaryReport(),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
          <p className="mt-2 text-2xl font-bold">{snapshot.student_count}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Staff</p>
          <p className="mt-2 text-2xl font-bold">{snapshot.staff_count}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Courses</p>
          <p className="mt-2 text-2xl font-bold">{snapshot.course_count}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Slots</p>
          <p className="mt-2 text-2xl font-bold">{snapshot.active_timetable_slots}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Average Score</p>
          <p className="mt-2 text-2xl font-bold">{snapshot.average_score}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="panel overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="section-heading">Course Performance</h2>
              <Link
                href="/api/reports/course-performance"
                className="text-sm font-semibold text-slate-700 underline"
              >
                Export CSV
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100/80 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Assessments</th>
                  <th className="px-5 py-3">Average Score</th>
                </tr>
              </thead>
              <tbody>
                {coursePerformance.map((item) => (
                  <tr key={item.course_code} className="border-t border-[color:var(--border)]">
                    <td className="px-5 py-3 font-semibold">
                      {item.course_code} - {item.course_title}
                    </td>
                    <td className="px-5 py-3">{item.assessments}</td>
                    <td className="px-5 py-3">{item.average_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="section-heading">Payroll Summary</h2>
              <Link
                href="/api/reports/payroll-summary"
                className="text-sm font-semibold text-slate-700 underline"
              >
                Export CSV
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100/80 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3">Cycle</th>
                  <th className="px-5 py-3">Entries</th>
                  <th className="px-5 py-3">Gross</th>
                  <th className="px-5 py-3">Deductions</th>
                  <th className="px-5 py-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {payrollSummary.map((item) => (
                  <tr key={item.cycle_code} className="border-t border-[color:var(--border)]">
                    <td className="px-5 py-3 font-semibold">{item.cycle_code}</td>
                    <td className="px-5 py-3">{item.entries}</td>
                    <td className="px-5 py-3">${item.total_gross.toFixed(2)}</td>
                    <td className="px-5 py-3">${item.total_deductions.toFixed(2)}</td>
                    <td className="px-5 py-3">${item.total_net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="section-heading">Fee Collection</h2>
              <Link
                href="/api/reports/fee-collection"
                className="text-sm font-semibold text-slate-700 underline"
              >
                Export CSV
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100/80 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3">Month</th>
                  <th className="px-5 py-3">Invoices</th>
                  <th className="px-5 py-3">Billed</th>
                  <th className="px-5 py-3">Collected</th>
                  <th className="px-5 py-3">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {feeSummary.map((item) => (
                  <tr key={item.month} className="border-t border-[color:var(--border)]">
                    <td className="px-5 py-3 font-semibold">{item.month}</td>
                    <td className="px-5 py-3">{item.invoices}</td>
                    <td className="px-5 py-3">${item.billed_amount.toFixed(2)}</td>
                    <td className="px-5 py-3">${item.collected_amount.toFixed(2)}</td>
                    <td className="px-5 py-3">${item.outstanding_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Attendance Distribution</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {snapshot.attendance_distribution.map((item) => (
            <div key={item.state} className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3">
              <p className="text-sm font-semibold capitalize">{item.state}</p>
              <p className="mt-2 text-xl font-bold">{item.count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
