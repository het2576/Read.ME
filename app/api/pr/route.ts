// /app/api/pr/route.ts — POST: Create a GitHub PR with the generated README
// Chains 5 GitHub API operations: SHA → branch → fileSHA → commit → PR

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getBranchSHA,
  createBranch,
  getFileSHA,
  createOrUpdateFile,
  createPR,
} from '@/lib/github';
import {
  getUserByGithubId,
  getLatestReadme,
  updateReadmePR,
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

    // 2. Parse request body
    const { repoId, readmeId, branchName, prTitle, prBody } =
      await request.json();

    if (!repoId || !branchName || !prTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: repoId, branchName, prTitle.' },
        { status: 400 }
      );
    }

    // 3. Verify user + fetch repo details
    const dbUser = await getUserByGithubId(githubId);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 401 }
      );
    }

    const { data: repoData, error: repoError } = await supabaseAdmin
      .from('repos')
      .select('owner, name, default_branch')
      .eq('id', repoId)
      .eq('user_id', dbUser.id)
      .single();

    if (repoError || !repoData) {
      return NextResponse.json(
        { error: 'Repository not found or access denied.' },
        { status: 404 }
      );
    }

    const { owner, name: repo, default_branch: defaultBranch } = repoData;

    // 4. Get README content
    let readmeContent: string;
    if (readmeId) {
      const { data: readmeData } = await supabaseAdmin
        .from('readmes')
        .select('content, id')
        .eq('id', readmeId)
        .single();
      readmeContent = readmeData?.content || '';
    } else {
      const latestReadme = await getLatestReadme(repoId);
      if (!latestReadme) {
        return NextResponse.json(
          { error: 'No README found. Generate a README first.' },
          { status: 404 }
        );
      }
      readmeContent = latestReadme.content;
    }

    if (!readmeContent) {
      return NextResponse.json(
        { error: 'README content is empty. Please regenerate it.' },
        { status: 400 }
      );
    }

    // Step 1 — Get default branch SHA
    let baseSHA: string;
    try {
      baseSHA = await getBranchSHA(accessToken, owner, repo, defaultBranch);
    } catch {
      return NextResponse.json(
        { error: `Could not read branch "${defaultBranch}". Check repo permissions.` },
        { status: 422 }
      );
    }

    // Step 2 — Create new branch (handles conflicts with timestamp suffix)
    let actualBranchName: string;
    try {
      actualBranchName = await createBranch(
        accessToken,
        owner,
        repo,
        branchName,
        baseSHA
      );
    } catch (error) {
      const msg = String(error);
      if (msg.includes('403') || msg.includes('Forbidden')) {
        return NextResponse.json(
          {
            error:
              'GitHub token lacks write permissions. Reconnect GitHub with repo write scope.',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create branch: ${msg}` },
        { status: 422 }
      );
    }

    // Step 3 — Get existing README SHA (null if file doesn't exist yet)
    const existingFileSHA = await getFileSHA(
      accessToken,
      owner,
      repo,
      'README.md',
      actualBranchName
    );

    // Step 4 — Create or update README.md on the new branch
    try {
      await createOrUpdateFile(
        accessToken,
        owner,
        repo,
        'README.md',
        readmeContent,
        'docs: update README via RepoDoc',
        actualBranchName,
        existingFileSHA
      );
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to upload README: ${String(error)}` },
        { status: 500 }
      );
    }

    // Step 5 — Create Pull Request
    let prResult: { url: string; number: number };
    try {
      prResult = await createPR(
        accessToken,
        owner,
        repo,
        prTitle,
        prBody || '',
        actualBranchName,
        defaultBranch
      );
    } catch (error) {
      const msg = String(error);
      if (msg.includes('A pull request already exists')) {
        return NextResponse.json(
          {
            error: `A PR already exists for branch "${actualBranchName}". Check your GitHub repository.`,
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: `Failed to open PR: ${msg}` },
        { status: 500 }
      );
    }

    // 5. Save PR info to DB
    const targetReadmeId = readmeId || (await getLatestReadme(repoId))?.id;
    if (targetReadmeId) {
      try {
        await updateReadmePR(targetReadmeId, prResult.url, prResult.number);
      } catch {
        // Non-critical — PR was still created successfully
      }
    }

    return NextResponse.json({
      prUrl: prResult.url,
      prNumber: prResult.number,
      branchName: actualBranchName,
    });
  } catch (error) {
    console.error('PR API error:', error);
    return NextResponse.json(
      { error: 'Failed to create pull request. Please try again.' },
      { status: 500 }
    );
  }
}
