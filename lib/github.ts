// /lib/github.ts — GitHub API client via Octokit
// All GitHub read operations for repo analysis + listing

import { Octokit } from 'octokit';
import type { GitHubRepo } from '@/types';

export function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

/**
 * Fetch authenticated user's repositories.
 * Returns up to 100 repos sorted by most recently updated.
 */
export async function getUserRepos(token: string): Promise<GitHubRepo[]> {
  const octokit = getOctokit(token);

  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
    type: 'owner',
  });

  return data.map((repo) => ({
    id: repo.id,
    full_name: repo.full_name,
    owner: repo.owner.login,
    name: repo.name,
    is_private: repo.private,
    default_branch: repo.default_branch || 'main',
    description: repo.description,
    updated_at: repo.updated_at || '',
  }));
}

/**
 * Fetch the file tree of a repository (recursive).
 * Returns an array of file paths.
 * For repos with >5000 files, truncates to avoid API limits.
 */
export async function getRepoTree(
  token: string,
  owner: string,
  repo: string
): Promise<string[]> {
  const octokit = getOctokit(token);

  try {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: '1',
    });

    // Return only file paths (not directories), cap at 5000
    return data.tree
      .filter((item) => item.type === 'blob' && item.path)
      .map((item) => item.path!)
      .slice(0, 5000);
  } catch {
    // Fallback: non-recursive tree for very large repos
    try {
      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: 'HEAD',
      });
      return data.tree
        .filter((item) => item.path)
        .map((item) => item.path!);
    } catch {
      return [];
    }
  }
}

/**
 * Fetch a single file's content from a repository.
 * Returns the file content as a string, truncated to 300 lines.
 * Returns null if the file doesn't exist or fetch fails.
 */
export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const octokit = getOctokit(token);

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      mediaType: { format: 'raw' },
    });

    // data is a string when using raw format
    const content = typeof data === 'string' ? data : '';
    
    // Truncate to 300 lines
    const lines = content.split('\n');
    if (lines.length > 300) {
      return lines.slice(0, 300).join('\n') + '\n... (truncated)';
    }

    return content;
  } catch {
    return null; // File not found or access denied
  }
}

/**
 * Get the default branch name of a repository.
 */
export async function getDefaultBranch(
  token: string,
  owner: string,
  repo: string
): Promise<string> {
  const octokit = getOctokit(token);

  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data.default_branch;
}

// ──────────────────────────────────────────
// Write operations — for Auto PR (Phase 4)
// ──────────────────────────────────────────

/**
 * Get the SHA of the tip commit on a branch.
 * Used to base a new branch off an existing one.
 */
export async function getBranchSHA(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const octokit = getOctokit(token);

  const { data } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  return data.object.sha;
}

/**
 * Create a new branch at the given SHA.
 * If the branch already exists, appends a unix timestamp and retries once.
 * Returns the final branch name used.
 */
export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  sha: string
): Promise<string> {
  const octokit = getOctokit(token);

  try {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
    return branchName;
  } catch (error) {
    // Branch already exists — retry with timestamp suffix
    const errorMsg = String(error);
    if (errorMsg.includes('Reference already exists') || errorMsg.includes('422')) {
      const fallback = `${branchName}-${Date.now()}`;
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${fallback}`,
        sha,
      });
      return fallback;
    }
    throw error;
  }
}

/**
 * Get the SHA of an existing file (needed to update it).
 * Returns null if the file doesn't exist yet.
 */
export async function getFileSHA(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string | null> {
  const octokit = getOctokit(token);

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data)) return null;
    return (data as { sha: string }).sha;
  } catch {
    return null; // File doesn't exist
  }
}

/**
 * Create or update a file in a repository on a specific branch.
 * If sha is provided, updates the existing file. Otherwise creates a new one.
 */
export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string | null
): Promise<void> {
  const octokit = getOctokit(token);

  // GitHub API requires base64-encoded content
  const encodedContent = Buffer.from(content, 'utf-8').toString('base64');

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: encodedContent,
    branch,
    ...(sha ? { sha } : {}),
  });
}

/**
 * Create a pull request.
 * Returns the PR URL and number.
 */
export async function createPR(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
): Promise<{ url: string; number: number }> {
  const octokit = getOctokit(token);

  const prBody = `${body}

---
*🤖 Generated by [RepoDoc](https://repodoc.app) — AI-powered documentation for developers.*`;

  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    title,
    body: prBody,
    head,
    base,
  });

  return {
    url: data.html_url,
    number: data.number,
  };
}

