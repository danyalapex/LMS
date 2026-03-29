import { NextResponse } from "next/server";
import { getRequestAuthUserId, userHasAnyRole } from "@/lib/auth-api";
import { getCoursePerformanceReport } from "@/lib/lms/queries";

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

  const rows = await getCoursePerformanceReport();

  const csvLines = [
    "course_code,course_title,assessments,average_score",
    ...rows.map((row) =>
      [
        toCsvValue(row.course_code),
        toCsvValue(row.course_title),
        toCsvValue(row.assessments),
        toCsvValue(row.average_score),
      ].join(","),
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=course-performance.csv",
    },
  });
}
