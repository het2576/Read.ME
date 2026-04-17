// /app/api/settings/apikey/route.ts
// API Key management endpoints.
//
// GET  /api/settings/apikey — Get current API key (auto-generate if none)
// POST /api/settings/apikey — Regenerate API key

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, getApiKeyForUser, generateAndSaveApiKey } from '@/db/queries';

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const githubId = (session.user as any).githubId;
  if (!githubId) return null;

  return getUserByGithubId(githubId);
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let apiKey = await getApiKeyForUser(user.id).catch(() => null);

  // Auto-generate if user doesn't have one yet
  if (!apiKey) {
    apiKey = await generateAndSaveApiKey(user.id);
    return NextResponse.json({ api_key: apiKey, just_generated: true });
  }

  return NextResponse.json({ api_key: apiKey, just_generated: false });
}

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const newKey = await generateAndSaveApiKey(user.id);
  return NextResponse.json({ api_key: newKey, regenerated: true });
}
