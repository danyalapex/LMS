import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[perf-metrics]", JSON.stringify(body));
    // TODO: forward to analytics or persist if needed
  } catch (err) {
    console.error("[perf-metrics] error", err);
  }
  return NextResponse.json({ ok: true });
}
