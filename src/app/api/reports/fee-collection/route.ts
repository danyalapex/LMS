import { NextResponse } from "next/server";
import { getRequestAuthUserId, userHasAnyRole } from "@/lib/auth-api";
import { getFeeCollectionSummaryReport } from "@/lib/lms/queries";

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

  const rows = await getFeeCollectionSummaryReport();
  const csvLines = [
    "month,invoices,billed_amount,collected_amount,outstanding_amount",
    ...rows.map((row) =>
      [
        toCsvValue(row.month),
        toCsvValue(row.invoices),
        toCsvValue(row.billed_amount),
        toCsvValue(row.collected_amount),
        toCsvValue(row.outstanding_amount),
      ].join(","),
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=fee-collection-summary.csv",
    },
  });
}
