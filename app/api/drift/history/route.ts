// /app/api/drift/history/route.ts — GET: Fetch drift history for a repo

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, getDriftHistory } from '@/db/queries';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const githubId = (session.user as any).githubId as string;

    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get('repoId');

    if (!repoId) {
      return NextResponse.json({ error: 'Missing repoId.' }, { status: 400 });
    }

    const dbUser = await getUserByGithubId(githubId);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    // Verify ownership
    const { data: repoData } = await supabaseAdmin
      .from('repos')
      .select('id')
      .eq('id', repoId)
      .eq('user_id', dbUser.id)
      .single();

    if (!repoData) {
      return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
    }

    const history = await getDriftHistory(repoId);
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Drift history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drift history.' },
      { status: 500 }
    );
  }
}
