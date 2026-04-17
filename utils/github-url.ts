// /utils/github-url.ts — Parse and validate GitHub repository URLs

const GITHUB_REPO_REGEX = /github\.com\/([^\/\s]+)\/([^\/\s#?]+)/;

/**
 * Parse a GitHub URL and extract owner and repo name.
 * Returns null if the URL is not a valid GitHub repository URL.
 *
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/main/...
 */
export function parseGitHubUrl(
  url: string
): { owner: string; repo: string } | null {
  const match = url.match(GITHUB_REPO_REGEX);

  if (!match) return null;

  const owner = match[1];
  // Strip .git suffix if present
  const repo = match[2].replace(/\.git$/, '');

  // Basic validation — owner and repo should be non-empty
  if (!owner || !repo) return null;

  return { owner, repo };
}
