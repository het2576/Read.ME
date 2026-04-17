// /prompts/roast.ts — Roast My README prompt builder
// Source: PRD §6 Prompt 1

export function buildRoastPrompt(
  readmeContent: string,
  repoName: string
): string {
  return `
You are a brutally honest senior developer reviewing README quality.
Analyze the following README and return a strict JSON evaluation.

Repository: ${repoName}

README Content:
---
${readmeContent.slice(0, 4000)}
---

Score each criterion 0–10:
1. clarity       — Project purpose obvious in first 2 lines?
2. setup         — Installation steps present and specific?
3. usage         — Real code examples provided?
4. structure     — Sections organized logically?
5. completeness  — License, contributing guide, contact present?
6. specificity   — Content specific to THIS project or generic filler?

Grade: A=90–100, B=75–89, C=60–74, D=45–59, F=0–44
Overall score = average of all 6 × 10

Return ONLY valid JSON. No explanation. No markdown fences. No backticks.

{
  "grade": "B",
  "score": 68,
  "summary": "One brutal sentence about the single biggest problem",
  "criteria": {
    "clarity":      { "score": 7, "issue": "specific issue or null" },
    "setup":        { "score": 4, "issue": "specific issue or null" },
    "usage":        { "score": 3, "issue": "specific issue or null" },
    "structure":    { "score": 8, "issue": "specific issue or null" },
    "completeness": { "score": 5, "issue": "specific issue or null" },
    "specificity":  { "score": 6, "issue": "specific issue or null" }
  },
  "top_issues": [
    "Specific actionable issue 1",
    "Specific actionable issue 2",
    "Specific actionable issue 3"
  ]
}
`.trim();
}
