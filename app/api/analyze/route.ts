// /app/api/analyze/route.ts — POST: Analyze a GitHub repo
// Authenticated endpoint — runs analysis and saves to DB

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeRepo } from '@/lib/analyzer';
import { isQuotaError } from '@/lib/gemini';
import {
  getUserByGithubId,
  upsertRepo,
  saveAnalysis,
  updateRepoAnalyzedAt,
} from '@/db/queries';
import { getRepoTree, getDefaultBranch } from '@/lib/github';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check — pass authOptions to decode JWT properly
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

    // 2. Parse request body
    const { owner, repo } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing owner or repo in request body.' },
        { status: 400 }
      );
    }

    // 3. Get user from DB
    const dbUser = await getUserByGithubId(githubId);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 401 }
      );
    }

    // 4. Get default branch + upsert repo
    let defaultBranch = 'main';
    try {
      defaultBranch = await getDefaultBranch(accessToken, owner, repo);
    } catch {
      // fallback to 'main'
    }

    const dbRepo = await upsertRepo({
      user_id: dbUser.id,
      owner,
      name: repo,
      full_name: `${owner}/${repo}`,
      is_private: false,
      default_branch: defaultBranch,
    });

    // 5. Run analysis
    const rawAnalysis = await analyzeRepo(accessToken, owner, repo);

    // Sanitize: normalize any array fields that Gemini returned as objects
    const analysis = sanitizeAnalysis(rawAnalysis);

    // 6. Fetch file tree for storage
    const fileTree = await getRepoTree(accessToken, owner, repo);

    // 7. Save to DB
    const savedAnalysis = await saveAnalysis(dbRepo.id, analysis, fileTree);
    await updateRepoAnalyzedAt(dbRepo.id);

    // 8. Return result
    return NextResponse.json({
      analysisId: savedAnalysis.id,
      repoId: dbRepo.id,
      analysis,
    });
  } catch (error) {
    console.error('Analyze API error:', error);

    if (isQuotaError(error)) {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

import type { RepoAnalysis } from '@/types';

/**
 * Normalize Gemini output — some models return arrays of objects instead of strings.
 * e.g. key_dependencies: [{name: "react", description: "UI"}] → ["react — UI"]
 */
function sanitizeAnalysis(analysis: RepoAnalysis): RepoAnalysis {
  const stringifyItem = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const name = obj.name || obj.title || obj.label;
      const desc = obj.description || obj.purpose || obj.use;
      if (name && desc) return `${name} — ${desc}`;
      if (name) return String(name);
      return JSON.stringify(item);
    }
    return String(item);
  };

  const sanitizeStringArray = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(stringifyItem);
  };

  return {
    ...analysis,
    tech_stack: sanitizeStringArray(analysis.tech_stack),
    key_dependencies: sanitizeStringArray(analysis.key_dependencies),
    env_variables: sanitizeStringArray(analysis.env_variables),
    api_routes: sanitizeStringArray(analysis.api_routes),
    notable_features: sanitizeStringArray(analysis.notable_features),
    prerequisites: sanitizeStringArray(analysis.prerequisites),
  };
}

