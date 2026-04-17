// /app/api/roast/route.ts — POST: Score a README by GitHub URL
// Public endpoint — no auth required, rate limited

import { NextRequest, NextResponse } from 'next/server';
import { generateText, parseJSON, isQuotaError } from '@/lib/gemini';
import { checkRateLimit } from '@/utils/rate-limit';
import { parseGitHubUrl } from '@/utils/github-url';
import { buildRoastPrompt } from '@/prompts/roast';
import type { RoastResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit: 10 requests per IP per hour
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (!checkRateLimit(ip, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in an hour.' },
        { status: 429 }
      );
    }

    // 2. Parse and validate GitHub URL
    const body = await request.json();
    const { repoUrl } = body;

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing repoUrl in request body.' },
        { status: 400 }
      );
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL. Expected: https://github.com/owner/repo' },
        { status: 400 }
      );
    }

    const { owner, repo } = parsed;

    // 3. Fetch README from GitHub (unauthenticated)
    const readmeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'User-Agent': 'RepoDoc/1.0',
        },
      }
    );

    // Handle GitHub errors
    if (readmeResponse.status === 404) {
      // No README found — return grade F
      const noReadmeResult: RoastResult = {
        grade: 'F',
        score: 0,
        summary: 'No README.md found in this repository.',
        criteria: {
          clarity: { score: 0, issue: 'No README exists' },
          setup: { score: 0, issue: 'No README exists' },
          usage: { score: 0, issue: 'No README exists' },
          structure: { score: 0, issue: 'No README exists' },
          completeness: { score: 0, issue: 'No README exists' },
          specificity: { score: 0, issue: 'No README exists' },
        },
        top_issues: [
          'No README.md found in this repository.',
          'Every project needs a README — it is the front door to your code.',
          'Create a README.md with at minimum: project description, installation, and usage instructions.',
        ],
      };
      return NextResponse.json(noReadmeResult);
    }

    if (readmeResponse.status === 403) {
      // GitHub rate limit or private repo
      const errorBody = await readmeResponse.text();
      if (errorBody.includes('rate limit')) {
        return NextResponse.json(
          { error: 'GitHub rate limit reached. Try again shortly.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'This repo is private. Sign in to analyze private repos.' },
        { status: 403 }
      );
    }

    if (!readmeResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch README from GitHub.' },
        { status: 502 }
      );
    }

    const readmeContent = await readmeResponse.text();

    // 4. Build prompt and call Gemini
    const prompt = buildRoastPrompt(readmeContent, `${owner}/${repo}`);

    let roastResult: RoastResult;
    try {
      const responseText = await generateText(prompt);
      roastResult = parseJSON<RoastResult>(responseText);
    } catch (aiError) {
      // Check if it was a timeout
      if (aiError instanceof Error && aiError.message === 'Gemini request timed out') {
        return NextResponse.json(
          { error: 'AI analysis timed out. Please try again.' },
          { status: 504 }
        );
      }

      // Check if it's a quota error — do NOT retry
      if (isQuotaError(aiError)) {
        return NextResponse.json(
          { error: 'AI service quota exceeded. Please try again in a few minutes.' },
          { status: 503 }
        );
      }

      console.error('Gemini parse error, retrying:', aiError);

      // Retry once with stricter instruction (only for parse errors)
      try {
        const retryText = await generateText(
          prompt + '\n\nIMPORTANT: Return ONLY the JSON object. No other text.'
        );
        roastResult = parseJSON<RoastResult>(retryText);
      } catch (retryError) {
        if (isQuotaError(retryError)) {
          return NextResponse.json(
            { error: 'AI service quota exceeded. Please try again in a few minutes.' },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to analyze README. Please try again.' },
          { status: 500 }
        );
      }
    }

    // 5. Return result
    return NextResponse.json(roastResult);
  } catch (error) {
    console.error('Roast API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
