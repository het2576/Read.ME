// /app/api/ci/check/route.ts
// CI Check Endpoint — used by the repodoc/docs-check GitHub Action
//
// Authentication: Bearer token (API key from /settings, starts with `rd_`)
// This is separate from OAuth session auth — CI environments need key-based auth.

import { NextRequest, NextResponse } from 'next/server';
import { getUserByApiKey, getRepoByFullName, getLatestAnalysis, getLatestReadme, getLatestDriftLog } from '@/db/queries';
import { runDriftCheck } from '@/lib/drift';

export async function POST(req: NextRequest) {
  // ── 1. Auth via Bearer API Key ────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer rd_...' },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey.startsWith('rd_')) {
    return NextResponse.json(
      { error: 'Invalid API key format. Keys should start with rd_' },
      { status: 401 }
    );
  }

  const user = await getUserByApiKey(apiKey).catch(() => null);
  if (!user) {
    return NextResponse.json(
      { error: 'Invalid API key. Get your key at repodoc.vercel.app/settings' },
      { status: 401 }
    );
  }

  // ── 2. Parse request body ─────────────────────────────────────
  let body: { owner?: string; repo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { owner, repo } = body;
  if (!owner || !repo) {
    return NextResponse.json(
      { error: 'Missing required fields: owner and repo' },
      { status: 400 }
    );
  }

  const fullName = `${owner}/${repo}`;

  // ── 3. Find repo in DB ────────────────────────────────────────
  const repoRecord = await getRepoByFullName(fullName).catch(() => null);
  if (!repoRecord) {
    return NextResponse.json(
      {
        drift_score: 0,
        status: 'unknown',
        summary: `Repo ${fullName} has not been analyzed on RepoDoc yet. Visit repodoc.vercel.app to run an analysis first.`,
        changed_items: [],
      },
      { status: 200 } // Return 200 so the CI doesn't fail just because of a missing analysis
    );
  }

  // ── 4. Get latest analysis + README ───────────────────────────
  const [analysis, readme, lastDriftLog] = await Promise.all([
    getLatestAnalysis(repoRecord.id).catch(() => null),
    getLatestReadme(repoRecord.id).catch(() => null),
    getLatestDriftLog(repoRecord.id).catch(() => null),
  ]);

  if (!analysis) {
    return NextResponse.json({
      drift_score: 0,
      status: 'unknown',
      summary: `No analysis found for ${fullName}. Run an analysis on RepoDoc first.`,
      changed_items: [],
    });
  }

  // ── 5. Run drift check (or return cached result if recent) ────
  // If a drift check was done in the last hour, return the cached result
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (lastDriftLog && new Date(lastDriftLog.checked_at) > oneHourAgo) {
    const driftData = lastDriftLog.drift_data as Record<string, unknown>;
    return NextResponse.json({
      drift_score: lastDriftLog.drift_score,
      status: lastDriftLog.status,
      summary: (driftData?.summary as string) || 'Documentation drift analysis complete.',
      changed_items: (driftData?.changed_items as unknown[]) || [],
    });
  }

  // Run a fresh drift check
  try {
    const driftResult = await runDriftCheck({
      repoId: repoRecord.id,
      currentAnalysis: analysis.analysis_data,
      currentReadme: readme?.content || '',
      accessToken: user.access_token,
      owner,
      repo,
    });

    return NextResponse.json({
      drift_score: driftResult.drift_score,
      status: driftResult.status,
      summary: driftResult.summary,
      changed_items: driftResult.changed_items || [],
    });
  } catch (err) {
    console.error('[CI Check] Drift check failed:', err);
    // Return last known state rather than erroring
    if (lastDriftLog) {
      const driftData = lastDriftLog.drift_data as Record<string, unknown>;
      return NextResponse.json({
        drift_score: lastDriftLog.drift_score,
        status: lastDriftLog.status,
        summary: (driftData?.summary as string) || 'Using cached drift result.',
        changed_items: (driftData?.changed_items as unknown[]) || [],
      });
    }
    return NextResponse.json({ error: 'Drift check failed', details: String(err) }, { status: 500 });
  }
}
