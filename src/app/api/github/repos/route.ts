import { NextResponse } from "next/server";
import { listUserRepos } from "@/lib/github";

/**
 * GET /api/github/repos
 *
 * Fetches all repositories for the authenticated GitHub user and classifies
 * each one as AI-related or not.
 *
 * Required header:  x-github-token: <PAT with repo scope>
 */
export async function GET(req: Request) {
  const token = req.headers.get("x-github-token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing x-github-token header. Provide a GitHub Personal Access Token with repo scope." },
      { status: 401 }
    );
  }

  try {
    const repos = await listUserRepos(token);
    return NextResponse.json(repos);
  } catch (err: any) {
    console.error("GitHub listUserRepos error:", err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
