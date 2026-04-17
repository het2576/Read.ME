// /db/queries.ts — All database queries in one place
// Each function uses supabaseAdmin (service role) for server-side operations

import { supabaseAdmin } from '@/lib/supabase';
import type { RepoAnalysis } from '@/types';

// ──────────────────────────────────────────
// Installations (GitHub App)
// ──────────────────────────────────────────

interface SaveInstallationInput {
  installation_id: number;
  account_login: string;
  account_type: string;
  user_id?: string;
}

/**
 * Save a new GitHub App installation.
 * Called when the `installation.created` webhook fires.
 */
export async function saveInstallation(input: SaveInstallationInput) {
  const { error } = await supabaseAdmin
    .from('installations')
    .upsert(
      {
        installation_id: input.installation_id,
        account_login: input.account_login,
        account_type: input.account_type,
        user_id: input.user_id || null,
        uninstalled_at: null, // reset if they re-install
      },
      { onConflict: 'installation_id' }
    );

  if (error) throw error;
}

/**
 * Mark an installation as deleted (soft delete).
 * Called when the `installation.deleted` webhook fires.
 */
export async function markInstallationDeleted(installationId: number) {
  const { error } = await supabaseAdmin
    .from('installations')
    .update({ uninstalled_at: new Date().toISOString() })
    .eq('installation_id', installationId);

  if (error) throw error;

  // Also mark all associated repos as not webhook_active
  await supabaseAdmin
    .from('repos')
    .update({ webhook_active: false })
    .eq('installation_id', installationId);
}

/**
 * Get the active installation for a user.
 * Returns null if the user hasn't installed the GitHub App.
 */
export async function getUserInstallation(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('installations')
    .select('*')
    .eq('user_id', userId)
    .is('uninstalled_at', null)
    .order('installed_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get a repo by its full_name (owner/repo).
 * Used in webhook handlers where we only have the full_name.
 */
export async function getRepoByFullName(fullName: string) {
  const { data, error } = await supabaseAdmin
    .from('repos')
    .select('*')
    .eq('full_name', fullName)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Upsert a repo record from a webhook event (no user_id known).
 * Updates installation_id and webhook_active status.
 */
export async function upsertRepoWithInstallation(input: {
  owner: string;
  name: string;
  full_name: string;
  installation_id: number;
}) {
  const { error } = await supabaseAdmin
    .from('repos')
    .upsert(
      {
        owner: input.owner,
        name: input.name,
        full_name: input.full_name,
        installation_id: input.installation_id,
        webhook_active: true,
      },
      { onConflict: 'full_name' }
    );

  if (error) throw error;
}

/**
 * Get the latest analysis for a repo identified by full_name.
 * Used in webhook push handler to check if repo has been set up.
 */
export async function getLatestAnalysisByFullName(fullName: string) {
  // First find the repo
  const repo = await getRepoByFullName(fullName);
  if (!repo) return null;

  const { data, error } = await supabaseAdmin
    .from('analyses')
    .select('*')
    .eq('repo_id', repo.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ──────────────────────────────────────────
// API Keys
// ──────────────────────────────────────────

/**
 * Get a user by their RepoDoc API key.
 * Used in the /api/ci/check endpoint for Bearer token auth.
 */
export async function getUserByApiKey(apiKey: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('api_key', apiKey)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Generate and save a new API key for a user.
 * Keys are prefixed with `rd_` for easy identification.
 * Returns the new key.
 */
export async function generateAndSaveApiKey(userId: string): Promise<string> {
  const newKey = `rd_${crypto.randomUUID().replace(/-/g, '')}`;

  const { error } = await supabaseAdmin
    .from('users')
    .update({ api_key: newKey, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
  return newKey;
}

/**
 * Get the API key for a user (returns masked version for display).
 */
export async function getApiKeyForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('api_key')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.api_key || null;
}

// ──────────────────────────────────────────
// Drift Alerts (for notification bell)
// ──────────────────────────────────────────

/**
 * Get repos with significant drift in the last 7 days for a user.
 * Used to populate the notification bell in the navbar.
 */
export async function getDriftAlerts(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('drift_logs')
    .select('*, repos!inner(full_name, user_id)')
    .eq('repos.user_id', userId)
    .lt('drift_score', 80)
    .gte('checked_at', sevenDaysAgo)
    .order('checked_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Array<{
    id: string;
    drift_score: number;
    status: string;
    checked_at: string;
    repos: { full_name: string };
  }>;
}

// ──────────────────────────────────────────
// Users
// ──────────────────────────────────────────

interface UpsertUserInput {
  github_id: string;
  github_username: string;
  github_avatar: string;
  email: string | null;
  access_token: string;
}

/**
 * Create or update a user record on sign-in.
 * Updates access_token + avatar on each login (token may have been refreshed).
 */
export async function upsertUser(input: UpsertUserInput) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        github_id: input.github_id,
        github_username: input.github_username,
        github_avatar: input.github_avatar,
        email: input.email,
        access_token: input.access_token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'github_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a user by their GitHub ID.
 */
export async function getUserByGithubId(githubId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('github_id', githubId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ──────────────────────────────────────────
// Repos
// ──────────────────────────────────────────

interface UpsertRepoInput {
  user_id: string;
  owner: string;
  name: string;
  full_name: string;
  is_private: boolean;
  default_branch: string;
}

/**
 * Create or update a repo record.
 * Uses (user_id, full_name) unique constraint.
 */
export async function upsertRepo(input: UpsertRepoInput) {
  const { data, error } = await supabaseAdmin
    .from('repos')
    .upsert(
      {
        user_id: input.user_id,
        owner: input.owner,
        name: input.name,
        full_name: input.full_name,
        is_private: input.is_private,
        default_branch: input.default_branch,
      },
      { onConflict: 'user_id,full_name' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all repos for a user with their last_analyzed_at timestamps.
 */
export async function getUserRepos(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('repos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update last_analyzed_at for a repo.
 */
export async function updateRepoAnalyzedAt(repoId: string) {
  const { error } = await supabaseAdmin
    .from('repos')
    .update({ last_analyzed_at: new Date().toISOString() })
    .eq('id', repoId);

  if (error) throw error;
}

// ──────────────────────────────────────────
// Analyses
// ──────────────────────────────────────────

/**
 * Save a new analysis for a repo.
 * Creates a new row each time (keeps history).
 */
export async function saveAnalysis(
  repoId: string,
  analysisData: RepoAnalysis,
  fileTree: string[]
) {
  const { data, error } = await supabaseAdmin
    .from('analyses')
    .insert({
      repo_id: repoId,
      analysis_data: analysisData,
      file_tree: fileTree,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the most recent analysis for a repo.
 */
export async function getLatestAnalysis(repoId: string) {
  const { data, error } = await supabaseAdmin
    .from('analyses')
    .select('*')
    .eq('repo_id', repoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ──────────────────────────────────────────
// Readmes
// ──────────────────────────────────────────

/**
 * Save a new README version.
 * Auto-increments version number based on existing versions for this repo.
 */
export async function saveReadme(
  repoId: string,
  analysisId: string,
  content: string
) {
  // Get current max version
  const { data: existing } = await supabaseAdmin
    .from('readmes')
    .select('version')
    .eq('repo_id', repoId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = existing ? existing.version + 1 : 1;

  const { data, error } = await supabaseAdmin
    .from('readmes')
    .insert({
      repo_id: repoId,
      analysis_id: analysisId,
      content,
      version: nextVersion,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the most recent README for a repo.
 */
export async function getLatestReadme(repoId: string) {
  const { data, error } = await supabaseAdmin
    .from('readmes')
    .select('*')
    .eq('repo_id', repoId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get all README versions for a repo (for version switcher).
 */
export async function getReadmeVersions(repoId: string) {
  const { data, error } = await supabaseAdmin
    .from('readmes')
    .select('id, version, created_at')
    .eq('repo_id', repoId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update a README's PR info after successful PR creation.
 */
export async function updateReadmePR(
  readmeId: string,
  prUrl: string,
  prNumber: number
) {
  const { error } = await supabaseAdmin
    .from('readmes')
    .update({ pr_url: prUrl, pr_number: prNumber })
    .eq('id', readmeId);

  if (error) throw error;
}

// ──────────────────────────────────────────
// Drift Logs
// ──────────────────────────────────────────

/**
 * Save a drift detection result to the drift_logs table.
 */
export async function saveDriftLog(
  repoId: string,
  driftScore: number,
  status: string,
  driftData: Record<string, unknown>,
  readmeId?: string | null
) {
  const { data, error } = await supabaseAdmin
    .from('drift_logs')
    .insert({
      repo_id: repoId,
      drift_score: driftScore,
      status,
      drift_data: driftData,
      readme_id: readmeId || null,
      checked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all drift logs for a repo ordered by date ASC (for history chart).
 */
export async function getDriftHistory(repoId: string) {
  const { data, error } = await supabaseAdmin
    .from('drift_logs')
    .select('drift_score, status, checked_at, drift_data')
    .eq('repo_id', repoId)
    .order('checked_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    date: row.checked_at,
    score: row.drift_score,
    status: row.status as 'in-sync' | 'minor-drift' | 'moderate-drift' | 'major-drift',
  }));
}

/**
 * Get the most recent drift log for a repo.
 */
export async function getLatestDriftLog(repoId: string) {
  const { data, error } = await supabaseAdmin
    .from('drift_logs')
    .select('*')
    .eq('repo_id', repoId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
