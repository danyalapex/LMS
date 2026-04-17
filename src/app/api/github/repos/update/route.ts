import { NextResponse } from "next/server";
import { updateRepoVisibility, isValidGitHubIdentifier } from "@/lib/github";

interface UpdateVisibilityRequest {
  /**
   * Array of repository full names (owner/repo) to make private.
   * Using full_name correctly handles repos across multiple organisations.
   */
  full_names: string[];
  /** GitHub PAT with repo scope */
  token: string;
}

interface RepoResult {
  repo: string;
  success: boolean;
  error?: string;
}

/**
 * POST /api/github/repos/update
 *
 * Makes the specified repositories private.
 *
 * Request body (JSON):
 *   { full_names: string[], token: string }
 *
 * Returns 200 when all repos succeed, 207 on partial success,
 * and 502 when all repos fail.
 */
export async function POST(req: Request) {
  let body: UpdateVisibilityRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { full_names, token } = body;

  if (!Array.isArray(full_names) || full_names.length === 0) {
    return NextResponse.json({ error: "full_names must be a non-empty array" }, { status: 400 });
  }
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // Validate every full_name is in "owner/repo" format with valid identifiers
  for (const full_name of full_names) {
    if (typeof full_name !== "string") {
      return NextResponse.json({ error: "All full_names must be strings" }, { status: 400 });
    }
    const parts = full_name.split("/");
    if (parts.length !== 2 || !isValidGitHubIdentifier(parts[0]) || !isValidGitHubIdentifier(parts[1])) {
      return NextResponse.json(
        { error: `Invalid full_name format: expected "owner/repo" with valid identifiers` },
        { status: 400 }
      );
    }
  }

  const results: RepoResult[] = [];

  for (const full_name of full_names) {
    const [owner, repo] = full_name.split("/");
    try {
      await updateRepoVisibility(owner, repo, true, token);
      results.push({ repo: full_name, success: true });
    } catch (err: any) {
      console.error("Failed to update repo visibility:", err);
      results.push({ repo: full_name, success: false, error: err.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  let status: number;
  if (failureCount === 0) {
    status = 200;
  } else if (successCount === 0) {
    status = 502;
  } else {
    status = 207; // Multi-Status: partial success
  }

  return NextResponse.json({ results }, { status });
}
