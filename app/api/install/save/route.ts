// /app/api/install/save/route.ts
// Called by the install callback page after GitHub redirects back.
// Saves the installation_id to the current user's record in the DB.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, saveInstallation } from '@/db/queries';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(session?.user as any)?.githubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { installation_id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { installation_id } = body;
  if (!installation_id) {
    return NextResponse.json({ error: 'Missing installation_id' }, { status: 400 });
  }

  // Get full user record from DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await getUserByGithubId((session!.user as any).githubId).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (session?.user as any)?.name || '';
    await saveInstallation({
      installation_id,
      account_login: userName,
      account_type: 'User',
      user_id: user.id,
    });

    return NextResponse.json({ ok: true, installation_id });
  } catch (err) {
    console.error('[Install Save] Error:', err);
    return NextResponse.json({ error: 'Failed to save installation' }, { status: 500 });
  }
}
