/**
 * GitHub API utilities for repository visibility management.
 *
 * Provides helpers to:
 *  - List all repos owned by an authenticated user (requires PAT)
 *  - Classify repos as AI-related or not based on name/description/topics
 *  - Update repo visibility (public ↔ private)
 */

/** Keywords that strongly indicate an AI / ML / data-science repository. */
const AI_KEYWORDS = [
  "ai",
  "ml",
  "machine-learning",
  "machine_learning",
  "deep-learning",
  "deep_learning",
  "neural",
  "model",
  "detection",
  "classification",
  "sentiment",
  "anomaly",
  "diarization",
  "speaker",
  "llm",
  "gpt",
  "transformer",
  "nlp",
  "vision",
  "prediction",
  "forecast",
  "regression",
  "dataset",
  "mnist",
  "cifar",
  "pytorch",
  "tensorflow",
  "keras",
  "scikit",
  "yolo",
  "bert",
  "gemma",
  "recommender",
  "recommendation",
  "clustering",
  "embedding",
  "chatbot",
  "generative",
  "diffusion",
  "mri",
  "lidc",
  "object-detection",
  "image-classification",
  "text-classification",
  "fake-news",
  "resume-job",
  "speech",
  "audio",
  "ocr",
  "ner",
  "aqi",
  "audit-ai",
  "multi-agent",
  "livestock",
];

export interface GithubRepo {
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

/**
 * Determines whether a repository is AI-related by checking its name,
 * description and topics against a curated keyword list.
 */
export function isAIRepo(repo: {
  name: string;
  description: string | null;
  topics: string[];
}): boolean {
  const haystack = `${repo.name} ${repo.description ?? ""} ${repo.topics.join(" ")}`.toLowerCase();
  return AI_KEYWORDS.some((kw) => haystack.includes(kw));
}

/** Minimal shape of a repository object returned by the GitHub REST API. */
interface GithubApiRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  topics: string[];
}

/**
 * Fetches all repositories owned by the authenticated user.
 * Requires a GitHub Personal Access Token with `repo` scope.
 *
 * @param token  GitHub PAT
 * @returns      Array of repos with an `isAI` classification flag
 */
export async function listUserRepos(token: string): Promise<GithubRepo[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const allRepos: GithubRepo[] = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner&sort=full_name`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${body}`);
    }

    const repos: GithubApiRepo[] = await res.json();
    if (repos.length === 0) break;

    for (const r of repos) {
      allRepos.push({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description ?? null,
        private: r.private,
        html_url: r.html_url,
        language: r.language ?? null,
        topics: r.topics ?? [],
        isAI: isAIRepo({
          name: r.name,
          description: r.description ?? null,
          topics: r.topics ?? [],
        }),
      });
    }

    page++;
  }

  return allRepos;
}

/**
 * Validates a GitHub username or repository name.
 *
 * GitHub enforces:
 * - Starts and ends with alphanumeric characters
 * - May contain hyphens and underscores in the middle
 * - 1–100 characters
 *
 * Exported so the API route can reuse the same validation without duplication.
 */
export function isValidGitHubIdentifier(value: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9_-]{0,98}[a-zA-Z0-9])?$/.test(value);
}

/**
 * Updates the visibility of a single repository.
 *
 * @param owner      GitHub username / organisation that owns the repo
 * @param repo       Repository name (not full_name)
 * @param makePrivate  true → private, false → public
 * @param token      GitHub PAT with `repo` scope
 */
export async function updateRepoVisibility(
  owner: string,
  repo: string,
  makePrivate: boolean,
  token: string
): Promise<void> {
  if (!isValidGitHubIdentifier(owner)) {
    throw new Error("Invalid owner name");
  }
  if (!isValidGitHubIdentifier(repo)) {
    throw new Error("Invalid repository name");
  }

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ private: makePrivate }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update "${repo}": ${res.status} ${body}`);
  }
}
