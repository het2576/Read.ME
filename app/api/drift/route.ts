// /app/api/drift/route.ts — POST: Run drift detection on a repo
// Fetch latest analysis → re-run → compare → score → save → return

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeRepo } from '@/lib/analyzer';
import { detectDrift } from '@/lib/drift';
import { isQuotaError } from '@/lib/gemini';
import {
  getUserByGithubId,
  getLatestAnalysis,
  getLatestReadme,
  saveAnalysis,
  updateRepoAnalyzedAt,
  saveDriftLog,
} from '@/db/queries';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any).accessToken as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const githubId = (session.user as any).githubId as string;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token. Please sign in again.' },
        { status: 401 }
      );
    }

    // 2. Parse body
    const { repoId } = await request.json();
    if (!repoId) {
      return NextResponse.json({ error: 'Missing repoId.' }, { status: 400 });
    }

    // 3. Get user
    const dbUser = await getUserByGithubId(githubId);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 401 }
      );
    }

    // 4. Get repo details
    const { data: repoData } = await supabaseAdmin
      .from('repos')
      .select('owner, name, default_branch')
      .eq('id', repoId)
      .eq('user_id', dbUser.id)
      .single();

    if (!repoData) {
      return NextResponse.json(
        { error: 'Repository not found.' },
        { status: 404 }
      );
    }

    const { owner, name: repo } = repoData;

    // 5. Fetch snapshot (most recent analysis)
    const snapshot = await getLatestAnalysis(repoId);
    if (!snapshot) {
      return NextResponse.json(
        {
          status: 'no_baseline',
          message: 'Analyze your repo first to enable drift detection.',
        },
        { status: 200 }
      );
    }

    // 6. Run fresh analysis (best-effort — fall back to snapshot if quota hit)
    let currentAnalysis = snapshot.analysis_data;
    let savedAnalysisId = snapshot.id;
    try {
      const freshAnalysis = await analyzeRepo(accessToken, owner, repo);
      const savedAnalysis = await saveAnalysis(repoId, freshAnalysis, []);
      await updateRepoAnalyzedAt(repoId);
      currentAnalysis = freshAnalysis;
      savedAnalysisId = savedAnalysis.id;
    } catch (analyzeErr) {
      // If re-analysis fails (quota/timeout), still run drift against README
      // using the saved snapshot as "current" — drift will be based on README vs code
      console.warn('Re-analysis failed, using snapshot for drift:', analyzeErr);
    }

    // 7. Fetch current README for comparison
    const latestReadme = await getLatestReadme(repoId);
    const currentReadme = latestReadme?.content || '';

    // 8. Detect drift
    const snapshotDate = new Date(snapshot.created_at);
    const driftReport = await detectDrift(
      `${owner}/${repo}`,
      snapshot.analysis_data,
      currentAnalysis,
      currentReadme,
      snapshotDate
    );

    // 10. Save drift log (fail gracefully)
    try {
      await saveDriftLog(
        repoId,
        driftReport.drift_score,
        driftReport.status,
        driftReport as unknown as Record<string, unknown>,
        latestReadme?.id || null
      );
    } catch (dbErr) {
      console.error('Failed to save drift log:', dbErr);
    }

    return NextResponse.json({
      driftReport,
      newAnalysisId: savedAnalysisId,
    });
  } catch (error) {
    console.error('Drift API error:', error);

    if (isQuotaError(error)) {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Drift detection failed. Please try again.' },
      { status: 500 }
    );
  }
}
