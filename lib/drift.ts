// /lib/drift.ts — Drift detection logic
// Compares two RepoAnalysis snapshots and calls Gemini to score staleness

import { generateText, parseJSON } from '@/lib/gemini';
import { buildDriftPrompt } from '@/prompts/drift';
import type { RepoAnalysis, DriftReport, DriftPromptInput } from '@/types';

/**
 * Detect documentation drift between a previous and current analysis.
 * Pre-computes a structural diff to reduce prompt noise before calling Gemini.
 */
export async function detectDrift(
  repoName: string,
  snapshot: RepoAnalysis,
  current: RepoAnalysis,
  currentReadme: string,
  snapshotDate: Date
): Promise<DriftReport> {
  const daysSinceSnapshot = Math.floor(
    (Date.now() - snapshotDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Pre-compute structural diff to reduce Gemini prompt noise
  const hasChanges = hasSignificantChanges(snapshot, current);

  // Short-circuit: if nothing changed, return perfect score
  if (!hasChanges) {
    return {
      drift_score: 100,
      status: 'in-sync',
      summary: 'Fully in sync. Your README accurately reflects your code.',
      changed_items: [],
      sections_to_update: [],
      recommendation: 'No action needed. Your documentation is up to date.',
    };
  }

  const input: DriftPromptInput = {
    repoName,
    snapshot,
    current,
    currentReadme,
    daysSinceSnapshot,
  };

  const prompt = buildDriftPrompt(input);
  let report: DriftReport;

  try {
    const responseText = await generateText(prompt);
    report = parseJSON<DriftReport>(responseText);
  } catch (error) {
    // Retry once with stricter instruction
    console.error('Drift parse error, retrying:', error);
    const retryText = await generateText(
      prompt + '\n\nIMPORTANT: Return ONLY the JSON object. No other text.'
    );
    report = parseJSON<DriftReport>(retryText);
  }

  return report;
}

/**
 * Pre-check if there are any documentation-relevant changes between two analyses.
 * Avoids wasting a Gemini call on trivially identical analyses.
 */
function hasSignificantChanges(
  snapshot: RepoAnalysis,
  current: RepoAnalysis
): boolean {
  // Safe defaults for all array fields (Gemini can return null)
  const snapEnv = snapshot.env_variables ?? [];
  const currEnv = current.env_variables ?? [];
  const snapStack = snapshot.tech_stack ?? [];
  const currStack = current.tech_stack ?? [];
  const snapRoutes = snapshot.api_routes ?? [];
  const currRoutes = current.api_routes ?? [];

  // Compare env variables
  const snapEnvSet = new Set(snapEnv);
  const currEnvSet = new Set(currEnv);
  if (
    snapEnv.some((e) => !currEnvSet.has(e)) ||
    currEnv.some((e) => !snapEnvSet.has(e))
  ) {
    return true;
  }

  // Compare scripts
  const scriptKeys = ['install', 'dev', 'build', 'test', 'start'] as const;
  for (const key of scriptKeys) {
    const a = snapshot.scripts?.[key] ?? null;
    const b = current.scripts?.[key] ?? null;
    if (a !== b) return true;
  }

  // Compare tech stack (set difference)
  const snapStackSet = new Set(snapStack);
  const currStackSet = new Set(currStack);
  if (
    snapStack.some((t) => !currStackSet.has(t)) ||
    currStack.some((t) => !snapStackSet.has(t))
  ) {
    return true;
  }

  // Compare API routes count
  if (snapRoutes.length !== currRoutes.length) return true;

  // Compare flags
  if (
    snapshot.has_docker !== current.has_docker ||
    snapshot.has_ci !== current.has_ci ||
    snapshot.has_tests !== current.has_tests
  ) {
    return true;
  }

  return false;
}

/**
 * Convenience wrapper for the CI check endpoint.
 * Re-analyzes the repo and compares against the stored analysis snapshot.
 * Returns a DriftReport without needing a pre-existing snapshot argument.
 */
export async function runDriftCheck(opts: {
  repoId: string;
  currentAnalysis: RepoAnalysis;
  currentReadme: string;
  accessToken: string;
  owner: string;
  repo: string;
}): Promise<DriftReport> {
  // Dynamic import to avoid circular deps at module level
  const { analyzeRepo } = await import('@/lib/analyzer');

  // Run a fresh analysis to compare against the stored snapshot
  const freshAnalysis = await analyzeRepo(opts.accessToken, opts.owner, opts.repo);

  return detectDrift(
    `${opts.owner}/${opts.repo}`,
    opts.currentAnalysis, // stored snapshot = "old"
    freshAnalysis,        // fresh scan = "new"
    opts.currentReadme,
    new Date()
  );
}
