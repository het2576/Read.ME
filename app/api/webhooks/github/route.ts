// /app/api/webhooks/github/route.ts
// GitHub App Webhook Handler
//
// GitHub calls this URL for every event the App subscribes to.
// We verify the HMAC signature first, then route to event handlers.

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, getInstallationOctokit } from '@/lib/github-app';
import {
  saveInstallation,
  markInstallationDeleted,
  upsertRepoWithInstallation,
  getRepoByFullName,
  getLatestAnalysisByFullName,
} from '@/db/queries';

// GitHub webhooks need the raw body for signature verification
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // ── 1. Read raw body ──────────────────────────────────────────
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  const event = req.headers.get('x-github-event');
  const deliveryId = req.headers.get('x-github-delivery');

  console.log(`[Webhook] Event: ${event} | Delivery: ${deliveryId}`);

  // ── 2. Verify signature ───────────────────────────────────────
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Webhook] GITHUB_APP_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const isValid = verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    console.warn('[Webhook] Invalid signature — rejecting');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 3. Parse payload ──────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── 4. Route to event handler ─────────────────────────────────
  try {
    const action = payload.action as string | undefined;

    if (event === 'installation') {
      if (action === 'created') await handleInstallationCreated(payload);
      if (action === 'deleted') await handleInstallationDeleted(payload);
    } else if (event === 'push') {
      await handlePush(payload);
    } else if (event === 'pull_request') {
      if (action === 'opened' || action === 'synchronize') {
        await handlePullRequest(payload);
      }
    } else if (event === 'ping') {
      console.log('[Webhook] Received ping — webhook is configured correctly ✅');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Handler error:', err);
    // Return 200 anyway — GitHub will retry on non-2xx, causing thundering herd
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

// ── Event Handlers ─────────────────────────────────────────────

/**
 * User installed the GitHub App on one or more repos.
 * Save the installation + upsert all repos.
 */
async function handleInstallationCreated(payload: Record<string, unknown>) {
  const installation = payload.installation as Record<string, unknown>;
  const repositories = (payload.repositories as Array<Record<string, unknown>>) || [];

  console.log(
    `[Webhook] Installation created: ${installation.account && (installation.account as Record<string, unknown>).login} (${installation.id})`
  );

  const account = installation.account as Record<string, unknown>;

  await saveInstallation({
    installation_id: installation.id as number,
    account_login: account.login as string,
    account_type: account.type as string,
  });

  // Upsert all repos that are part of this installation
  for (const repo of repositories) {
    const fullName = repo.full_name as string;
    const [owner, name] = fullName.split('/');
    await upsertRepoWithInstallation({
      owner,
      name,
      full_name: fullName,
      installation_id: installation.id as number,
    });
  }

  console.log(`[Webhook] Saved installation + ${repositories.length} repos`);
}

/**
 * User uninstalled the GitHub App.
 * Mark the installation as deleted (soft delete with timestamp).
 */
async function handleInstallationDeleted(payload: Record<string, unknown>) {
  const installation = payload.installation as Record<string, unknown>;
  const installationId = installation.id as number;

  console.log(`[Webhook] Installation deleted: ${installationId}`);
  await markInstallationDeleted(installationId);
}

/**
 * Code was pushed to a repo where the App is installed.
 * Check if any doc-relevant files changed, then trigger a drift check.
 */
async function handlePush(payload: Record<string, unknown>) {
  const repository = payload.repository as Record<string, unknown>;
  const commits = (payload.commits as Array<Record<string, unknown>>) || [];
  const fullName = repository.full_name as string;

  // Collect all changed file paths across all commits
  const changedFiles = commits.flatMap((c) => [
    ...((c.added as string[]) || []),
    ...((c.modified as string[]) || []),
    ...((c.removed as string[]) || []),
  ]);

  console.log(`[Webhook] Push to ${fullName}: ${changedFiles.length} files changed`);

  // Files that indicate documentation may be stale
  const docRelevantPatterns = [
    'package.json',
    'package-lock.json',
    'requirements.txt',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'go.sum',
    'Dockerfile',
    '.env.example',
    '.env.sample',
    'docker-compose.yml',
    'docker-compose.yaml',
    'composer.json',
    'Gemfile',
    'build.gradle',
    'pom.xml',
  ];

  const hasDocRelevantChange = changedFiles.some((f) =>
    docRelevantPatterns.some((pattern) => f.includes(pattern))
  );

  if (!hasDocRelevantChange) {
    console.log(`[Webhook] Push to ${fullName}: no doc-relevant changes, skipping drift check`);
    return;
  }

  // Check if this repo has been set up with RepoDoc
  const analysis = await getLatestAnalysisByFullName(fullName);
  if (!analysis) {
    console.log(`[Webhook] Push to ${fullName}: no analysis found, skipping`);
    return;
  }

  // Trigger drift check via our own API
  // We call the drift API route to keep the logic DRY
  console.log(`[Webhook] Push to ${fullName}: triggering drift check`);
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://repodoc.vercel.app';
    await fetch(`${baseUrl}/api/drift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-trigger': '1' },
      body: JSON.stringify({ repoFullName: fullName }),
    });
  } catch (err) {
    console.error('[Webhook] Failed to trigger drift check:', err);
  }
}

/**
 * A PR was opened or updated on a monitored repo.
 * If doc-relevant files are touched, post a helpful bot comment.
 */
async function handlePullRequest(payload: Record<string, unknown>) {
  const pullRequest = payload.pull_request as Record<string, unknown>;
  const repository = payload.repository as Record<string, unknown>;
  const installation = payload.installation as Record<string, unknown>;
  const fullName = repository.full_name as string;
  const prNumber = pullRequest.number as number;

  console.log(`[Webhook] PR #${prNumber} on ${fullName}`);

  // Check if repo is set up with RepoDoc
  const repoRecord = await getRepoByFullName(fullName);
  if (!repoRecord) {
    console.log(`[Webhook] PR on ${fullName}: not in RepoDoc, skipping`);
    return;
  }

  // Get installation Octokit to post comment
  const installationId = (installation?.id as number) || repoRecord.installation_id;
  if (!installationId) {
    console.log(`[Webhook] PR on ${fullName}: no installation ID, skipping`);
    return;
  }

  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = fullName.split('/');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const octokitAny = octokit as any;

  // Get changed files in this PR
  let files: Array<{ filename: string }> = [];
  try {
    const { data } = await octokitAny.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });
    files = data;
  } catch (err) {
    console.error('[Webhook] Failed to list PR files:', err);
    return;
  }

  const docFilePatterns = [
    'package.json',
    'requirements.txt',
    '.env.example',
    'Dockerfile',
    'docker-compose',
    'README',
    'CHANGELOG',
    'go.mod',
    'Cargo.toml',
    'pyproject.toml',
  ];

  const affectedDocFiles = files
    .map((f) => f.filename)
    .filter((path) => docFilePatterns.some((p) => path.toLowerCase().includes(p.toLowerCase())));

  if (affectedDocFiles.length === 0) {
    console.log(`[Webhook] PR #${prNumber}: no doc-relevant files changed`);
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://repodoc.vercel.app';
  const commentBody = `## 📄 RepoDoc: Documentation Check

This PR modifies \`${affectedDocFiles.join('`, `')}\` — files that may affect your README accuracy.

**What this means:** Your documentation might become outdated after this merge.

[→ Review suggested documentation updates](${baseUrl}/repo/${fullName})

---
*[RepoDoc](${baseUrl}) — Self-healing documentation for GitHub repos*`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (octokit as any).rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody,
    });
    console.log(`[Webhook] Posted docs check comment on PR #${prNumber}`);
  } catch (err) {
    console.error('[Webhook] Failed to post PR comment:', err);
  }
}
