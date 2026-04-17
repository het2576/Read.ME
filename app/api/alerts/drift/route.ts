// /app/api/alerts/drift/route.ts
// Returns drift alert data for the notification bell in the navbar.
// GET — returns repos with drift_score < 80 in the last 7 days for the current user.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, getDriftAlerts } from '@/db/queries';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ alerts: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const githubId = (session.user as any).githubId;
  if (!githubId) return NextResponse.json({ alerts: [] });

  const user = await getUserByGithubId(githubId).catch(() => null);
  if (!user) return NextResponse.json({ alerts: [] });

  const alerts = await getDriftAlerts(user.id).catch(() => []);
  return NextResponse.json({ alerts });
}
