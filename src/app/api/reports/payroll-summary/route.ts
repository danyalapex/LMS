import { NextResponse } from "next/server";
import { getRequestAuthUserId, userHasAnyRole } from "@/lib/auth-api";
import { getPayrollCycleSummaryReport } from "@/lib/lms/queries";

function toCsvValue(value: string | number): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export async function GET() {
  const authUserId = await getRequestAuthUserId();

  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await userHasAnyRole(authUserId, ["admin", "finance"]);

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await getPayrollCycleSummaryReport();

  const csvLines = [
    "cycle_code,period_start,period_end,entries,total_gross,total_deductions,total_net",
    ...rows.map((row) =>
      [
        toCsvValue(row.cycle_code),
        toCsvValue(row.period_start),
        toCsvValue(row.period_end),
        toCsvValue(row.entries),
        toCsvValue(row.total_gross),
        toCsvValue(row.total_deductions),
        toCsvValue(row.total_net),
      ].join(","),
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=payroll-summary.csv",
    },
  });
}
