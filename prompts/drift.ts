// /prompts/drift.ts — Drift detection prompt builder
// Source: PRD §6 Prompt 4

import type { DriftPromptInput } from '@/types';

export function buildDriftPrompt(input: DriftPromptInput): string {
  return `
You are a documentation auditor. Compare previous and current repository states.
Identify ONLY changes that make the existing README inaccurate or misleading.

Repository: ${input.repoName}
Days since last analysis: ${input.daysSinceSnapshot}

PREVIOUS ANALYSIS:
${JSON.stringify(input.snapshot, null, 2)}

CURRENT ANALYSIS:
${JSON.stringify(input.current, null, 2)}

CURRENT README (first 3000 chars):
---
${input.currentReadme.slice(0, 3000)}
---

Focus ONLY on documentation-breaking changes:
- New/removed dependencies affecting installation
- New/changed/removed env variables
- Changed scripts (install, run, build commands changed)
- New API routes not documented
- Tech stack changes
- Features removed but still documented

Ignore: cosmetic changes, non-breaking additions, internal refactors not visible in docs

Drift score: 100=perfect sync, 0=completely stale
Status: in-sync=90–100, minor-drift=70–89, moderate-drift=40–69, major-drift=0–39

Return ONLY valid JSON. No explanation. No markdown fences. No backticks.

{
  "drift_score": 85,
  "status": "minor-drift",
  "summary": "One sentence verdict",
  "changed_items": [
    {
      "category": "dependency",
      "change": "prisma added as new dependency",
      "readme_impact": "Installation section missing prisma generate step",
      "severity": "high"
    }
  ],
  "sections_to_update": ["Installation", "Environment Variables"],
  "recommendation": "Short specific action"
}
`.trim();
}
