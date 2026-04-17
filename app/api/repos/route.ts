// /app/api/repos/route.ts — GET: List user's GitHub repos
// Authenticated endpoint — returns repos enriched with last_analyzed_at

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserRepos as getGitHubRepos } from '@/lib/github';
import { getUserByGithubId, getUserRepos as getDbRepos } from '@/db/queries';

export async function GET() {
  try {
    // 1. Auth check — pass authOptions to decode JWT properly
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token from session
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

    // 2. Fetch repos from GitHub
    const githubRepos = await getGitHubRepos(accessToken);

    // 3. Get user from DB for enrichment
    const dbUser = await getUserByGithubId(githubId);
    let analyzedRepos: Record<string, string> = {};

    if (dbUser) {
      // Fetch analyzed repos from DB
      const dbRepos = await getDbRepos(dbUser.id);
      analyzedRepos = Object.fromEntries(
        dbRepos
          .filter((r: { last_analyzed_at: string | null }) => r.last_analyzed_at)
          .map((r: { full_name: string; last_analyzed_at: string }) => [
            r.full_name,
            r.last_analyzed_at,
          ])
      );
    }

    // 4. Enrich GitHub repos with last_analyzed_at
    const enrichedRepos = githubRepos.map((repo) => ({
      ...repo,
      last_analyzed_at: analyzedRepos[repo.full_name] || null,
    }));

    return NextResponse.json(enrichedRepos);
  } catch (error) {
    console.error('Repos API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repos.' },
      { status: 500 }
    );
  }
}
