"use client";

import { useState } from "react";
import { PremiumButton } from "@/components/ui/premium-components";
import { GlassCard } from "@/components/ui/glassmorphism-components";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  topics: string[];
  isAI: boolean;
}

type Phase = "form" | "review" | "executing" | "done";

interface RepoResult {
  repo: string;
  success: boolean;
  error?: string;
}

export default function GithubReposPage() {
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RepoResult[]>([]);

  // Repos the user has selected to make private (non-AI by default)
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());

  /** Step 1 — Fetch repos from GitHub */
  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/github/repos", {
        headers: { "x-github-token": token.trim() },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data: Repo[] = await res.json();
      setRepos(data);

      // Pre-select all non-AI repos that are currently public (key by full_name)
      const nonAI = new Set<string>(
        data.filter((r) => !r.isAI && !r.private).map((r) => r.full_name)
      );
      setSelectedRepos(nonAI);
      setPhase("review");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /** Toggle a repo in the selection set (keyed by full_name) */
  function toggleRepo(full_name: string) {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(full_name)) {
        next.delete(full_name);
      } else {
        next.add(full_name);
      }
      return next;
    });
  }

  /** Step 2 — Execute: make selected repos private */
  async function handleExecute() {
    if (selectedRepos.size === 0 || repos.length === 0) return;

    setPhase("executing");
    setError(null);

    // Build a list of full_names for selected repos; this correctly handles
    // repos from multiple organisations since each full_name carries its owner.
    const fullNames = repos
      .filter((r) => selectedRepos.has(r.full_name))
      .map((r) => r.full_name);

    try {
      const res = await fetch("/api/github/repos/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_names: fullNames,
          token: token.trim(),
        }),
      });

      const body = await res.json();
      setResults(body.results ?? []);
      setPhase("done");
    } catch (err: any) {
      setError(err.message);
      setPhase("review");
    }
  }

  const aiRepos = repos.filter((r) => r.isAI);
  const nonAiRepos = repos.filter((r) => !r.isAI);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GitHub Portfolio Manager</h1>
        <p className="text-slate-600 mt-1">
          Identify your AI/ML repositories and make non-AI repos private to sharpen your AI
          engineer profile.
        </p>
      </div>

      {/* ── Phase: form ── */}
      {phase === "form" && (
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Connect your GitHub account</h2>
          <p className="text-sm text-slate-600 mb-4">
            Enter a GitHub Personal Access Token (PAT) with <code className="bg-slate-100 px-1 rounded">repo</code> scope.
            The token is used only during this session and is never stored.
          </p>

          <form onSubmit={handleFetch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_…"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="mt-1 text-xs text-slate-500">
                Generate at{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  github.com/settings/tokens
                </a>{" "}
                — enable the <strong>repo</strong> scope.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <PremiumButton type="submit" disabled={loading || !token.trim()}>
              {loading ? "Fetching repositories…" : "Fetch my repositories"}
            </PremiumButton>
          </form>
        </GlassCard>
      )}

      {/* ── Phase: review ── */}
      {phase === "review" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <GlassCard className="bg-blue-50 border-blue-200">
              <p className="text-sm text-slate-600">Total repos</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{repos.length}</p>
            </GlassCard>
            <GlassCard className="bg-green-50 border-green-200">
              <p className="text-sm text-slate-600">AI / ML repos</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{aiRepos.length}</p>
            </GlassCard>
            <GlassCard className="bg-amber-50 border-amber-200">
              <p className="text-sm text-slate-600">Non-AI repos (to hide)</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">{nonAiRepos.length}</p>
            </GlassCard>
          </div>

          {/* AI repos — read-only list, will NOT be changed */}
          <GlassCard>
            <h2 className="text-lg font-semibold text-green-700 mb-3">
              ✅ AI / ML Repositories — will stay public
            </h2>
            {aiRepos.length === 0 ? (
              <p className="text-sm text-slate-500">No AI repos detected.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {aiRepos.map((r) => (
                  <li key={r.id} className="py-2 flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <div className="min-w-0">
                      <a
                        href={r.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        {r.name}
                      </a>
                      {r.description && (
                        <p className="text-xs text-slate-500 truncate">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.language && (
                          <span className="text-xs text-slate-400">{r.language}</span>
                        )}
                        {r.private && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            private
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          {/* Non-AI repos — user can deselect any they want to keep public */}
          <GlassCard>
            <h2 className="text-lg font-semibold text-amber-700 mb-1">
              🔒 Non-AI Repositories — confirm which to make private
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              All ticked repos will be set to <strong>private</strong>. Untick any you want to keep
              public.
            </p>
            {nonAiRepos.length === 0 ? (
              <p className="text-sm text-slate-500">No non-AI repos found.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {nonAiRepos.map((r) => {
                  const checked = selectedRepos.has(r.full_name);
                  const alreadyPrivate = r.private;
                  return (
                    <li key={r.id} className="py-2 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={alreadyPrivate}
                        onChange={() => toggleRepo(r.full_name)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="min-w-0">
                        <a
                          href={r.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-700 hover:underline"
                        >
                          {r.name}
                        </a>
                        {r.description && (
                          <p className="text-xs text-slate-500 truncate">{r.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.language && (
                            <span className="text-xs text-slate-400">{r.language}</span>
                          )}
                          {alreadyPrivate && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              already private
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <PremiumButton
              onClick={handleExecute}
              disabled={selectedRepos.size === 0}
            >
              Make {selectedRepos.size} repo{selectedRepos.size !== 1 ? "s" : ""} private
            </PremiumButton>
            <PremiumButton
              variant="secondary"
              onClick={() => {
                setPhase("form");
                setRepos([]);
                setError(null);
              }}
            >
              Start over
            </PremiumButton>
          </div>
        </>
      )}

      {/* ── Phase: executing ── */}
      {phase === "executing" && (
        <GlassCard className="text-center py-12">
          <p className="text-lg font-semibold text-slate-700">
            Updating repository visibility…
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Making {selectedRepos.size} repositories private. Please wait.
          </p>
        </GlassCard>
      )}

      {/* ── Phase: done ── */}
      {phase === "done" && (
        <>
          <GlassCard className="bg-green-50 border-green-200">
            <h2 className="text-lg font-semibold text-green-700 mb-3">✅ Done</h2>
            <p className="text-sm text-slate-600 mb-4">
              {results.filter((r) => r.success).length} of {results.length} repositories were made
              private successfully.
            </p>
          </GlassCard>

          <GlassCard>
            <h3 className="text-base font-semibold text-slate-800 mb-3">Results</h3>
            <ul className="divide-y divide-slate-100">
              {results.map((r) => (
                <li key={r.repo} className="py-2 flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${r.success ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="text-sm font-medium text-slate-800 flex-1">{r.repo}</span>
                  {r.success ? (
                    <span className="text-xs text-green-600 font-medium">private ✓</span>
                  ) : (
                    <span className="text-xs text-red-600">{r.error ?? "failed"}</span>
                  )}
                </li>
              ))}
            </ul>
          </GlassCard>

          <PremiumButton
            variant="secondary"
            onClick={() => {
              setPhase("form");
              setRepos([]);
              setResults([]);
              setError(null);
              setToken("");
            }}
          >
            Run again
          </PremiumButton>
        </>
      )}
    </div>
  );
}
