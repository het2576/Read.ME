// /app/api/generate/route.ts — POST: Generate README from analysis
// Authenticated endpoint — fetches analysis, generates README, saves to DB

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateReadme } from '@/lib/generator';
import { isQuotaError } from '@/lib/gemini';
import {
  getUserByGithubId,
  getLatestAnalysis,
  saveReadme,
} from '@/db/queries';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const githubId = (session.user as any).githubId as string;

    // 2. Parse request body
    const { repoId, analysisId } = await request.json();

    if (!repoId) {
      return NextResponse.json(
        { error: 'Missing repoId in request body.' },
        { status: 400 }
      );
    }

    // 3. Get user from DB (verify ownership)
    const dbUser = await getUserByGithubId(githubId);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 401 }
      );
    }

    // 4. Fetch analysis from DB
    const analysis = await getLatestAnalysis(repoId);
    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis found. Please analyze the repo first.' },
        { status: 404 }
      );
    }

    // 5. Generate README (pass file tree for richer context)
    const fileTree = analysis.file_tree || [];
    const readmeContent = await generateReadme(analysis.analysis_data, fileTree);

    // 6. Try to save to DB — fail gracefully if DB has issues
    let savedReadme = null;
    try {
      savedReadme = await saveReadme(
        repoId,
        analysisId || analysis.id,
        readmeContent
      );
    } catch (dbError) {
      console.error('Failed to save README to DB:', dbError);
      // Continue — still return the generated content even if DB save fails
    }

    // 7. Return result
    return NextResponse.json({
      readmeId: savedReadme?.id || null,
      content: readmeContent,
      version: savedReadme?.version || 1,
    });
  } catch (error) {
    console.error('Generate API error:', error);

    if (isQuotaError(error)) {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'README generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
