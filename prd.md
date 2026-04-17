# RepoDoc — Self-Healing README for GitHub Repositories
## Product Requirements Document — Resume/Portfolio Quality

> Version: 2.0 | Type: Portfolio SaaS Product | Stack: Next.js 14 + TypeScript + Tailwind + Supabase + Gemini API

---

## 1. 🧭 Product Overview

**What we are building:**
RepoDoc is an AI-powered documentation intelligence platform that connects to your GitHub repositories, reads your actual code, generates accurate README files, raises PRs automatically, and monitors documentation drift over time — keeping your docs always in sync with your codebase.

**Target User:**
- Individual developers with OSS or portfolio projects
- Small engineering teams (2–10 devs)
- Open source maintainers tired of stale documentation

**Core Value Proposition:**
> "RepoDoc reads your code, writes your docs, and tells you when they break — automatically."

**The 5 pillars:**
1. 🔥 **Roast My README** — viral public tool, zero login required
2. 🧠 **GitHub Repo Analyzer** — reads real code, not user descriptions
3. ⚡ **Smart README Generator** — accurate, specific, code-grounded output
4. 🤖 **Auto PR Creation** — raises a real GitHub PR with updated docs
5. 🔄 **Doc Drift Detection + History** — monitors staleness over time with chart

**What makes this impressive on a resume:**
- Full OAuth + GitHub write-scope integration (branch creation, PR creation)
- Real PostgreSQL database with relational schema and Row Level Security
- Async analysis pattern with real-time progress feedback
- Time-series data + recharts visualization
- Production deployment with proper environment management
- End-to-end AI pipeline: code → analysis → generation → PR → monitoring

---

## 2. 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                  │
│            Next.js 14 App Router + TypeScript + Tailwind            │
│                                                                     │
│  /                        → Landing + Roast My README               │
│  /dashboard               → Repo grid + quick actions               │
│  /repo/[owner]/[repo]     → Repo workspace: analyze/generate/drift  │
│  /repo/[owner]/[repo]/history → Drift score history + chart         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP + Server Actions
┌───────────────────────────────▼─────────────────────────────────────┐
│                        NEXT.JS API ROUTES                           │
│                                                                     │
│  POST /api/roast              → Score a README (public, no auth)    │
│  POST /api/analyze            → Trigger repo analysis               │
│  POST /api/generate           → Generate README from analysis       │
│  POST /api/pr                 → Raise GitHub PR with new README     │
│  POST /api/drift              → Run drift check, save to DB         │
│  GET  /api/drift/history      → Fetch drift score history           │
│  GET  /api/repos              → List user's GitHub repos            │
│  GET  /api/auth/[...nextauth] → GitHub OAuth                        │
└────┬──────────────────────────┬──────────────────────────────────┬──┘
     │                          │                                  │
┌────▼────────┐      ┌──────────▼──────────┐           ┌──────────▼──┐
│  GitHub API │      │     Gemini API       │           │  Supabase   │
│ (Octokit)   │      │  (gemini-2.5-flash)  │           │ (PostgreSQL)│
│             │      │                      │           │             │
│ OAuth flow  │      │ Roast prompts        │           │ users       │
│ Repo tree   │      │ Analysis prompts     │           │ repos       │
│ File fetch  │      │ Generation prompts   │           │ analyses    │
│ Branch ops  │      │ Drift prompts        │           │ readmes     │
│ PR creation │      │                      │           │ drift_logs  │
└─────────────┘      └──────────────────────┘           └─────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | Supabase (PostgreSQL) | Free tier, instant setup, Row Level Security, looks great on resume |
| Auth | NextAuth.js + GitHub Provider | Handles token refresh, session, easy to extend |
| AI Model | gemini-2.5-flash | Fast (< 3s), cheap, sufficient. Upgrade path: gemini-2.5-pro |
| Deployment | Vercel | Zero-config for Next.js, free tier, preview deployments |
| GitHub Integration | OAuth App with `repo` scope | Sufficient for portfolio; GitHub App is V2 |
| Styling | Tailwind + shadcn/ui | Fast, professional, what real SaaS products look like |

---

## 3. 📁 Folder Structure

```
/repodoc
├── /app
│   ├── /api
│   │   ├── /auth
│   │   │   └── [...nextauth]/route.ts      # GitHub OAuth via NextAuth
│   │   ├── /roast/route.ts                 # POST: score README by URL
│   │   ├── /analyze/route.ts               # POST: analyze repo
│   │   ├── /generate/route.ts              # POST: generate README
│   │   ├── /pr/route.ts                    # POST: raise GitHub PR
│   │   ├── /drift/route.ts                 # POST: run drift check
│   │   ├── /drift/history/route.ts         # GET: drift score history
│   │   └── /repos/route.ts                 # GET: user's GitHub repos
│   ├── /dashboard/page.tsx                 # Repo grid
│   ├── /repo/[owner]/[repo]/page.tsx       # Main repo workspace
│   ├── /repo/[owner]/[repo]/history/page.tsx # Drift history chart
│   ├── layout.tsx                          # Root layout + SessionProvider
│   └── page.tsx                            # Landing + Roast My README
│
├── /components
│   ├── /ui                                 # shadcn/ui components
│   ├── RoastInput.tsx                      # URL input + submit
│   ├── RoastResult.tsx                     # Grade + issues display
│   ├── RepoCard.tsx                        # Card for dashboard grid
│   ├── AnalysisProgress.tsx                # Animated step progress
│   ├── ReadmeEditor.tsx                    # Split pane markdown editor
│   ├── PrCreator.tsx                       # Branch + PR creation modal
│   ├── DriftPanel.tsx                      # Drift score + changed items
│   ├── DriftChart.tsx                      # recharts line chart
│   └── Navbar.tsx                          # Top nav with auth state
│
├── /lib
│   ├── github.ts                           # Octokit + all GitHub helpers
│   ├── gemini.ts                           # Gemini client + timeout/fallback
│   ├── analyzer.ts                         # Repo analysis logic
│   ├── generator.ts                        # README generation logic
│   ├── drift.ts                            # Drift detection logic
│   └── supabase.ts                         # Supabase server + browser clients
│
├── /db
│   ├── schema.sql                          # Full database schema
│   └── queries.ts                          # All DB queries in one place
│
├── /prompts
│   ├── roast.ts                            # Roast prompt builder
│   ├── analyze.ts                          # Analysis prompt builder
│   ├── generate.ts                         # Generation prompt builder
│   └── drift.ts                            # Drift prompt builder
│
├── /types/index.ts                         # All shared TypeScript interfaces
│
├── /utils
│   ├── github-url.ts                       # Parse + validate GitHub URLs
│   ├── markdown.ts                         # Markdown helpers
│   ├── rate-limit.ts                       # Simple IP rate limiter
│   └── constants.ts                        # App-wide constants
│
├── /hooks
│   ├── useAnalysis.ts                      # Analysis state + polling
│   ├── useReadme.ts                        # README generation state
│   └── useDrift.ts                         # Drift detection state
│
├── middleware.ts                            # Protect /dashboard and /repo routes
├── .env.local
├── next.config.ts
└── package.json
```

**Folder purpose summary:**
- `/app/api/*` — All server-side logic. One file per feature. No business logic in components.
- `/lib` — All reusable business logic. This is where the real work lives.
- `/prompts` — All LLM prompts isolated. Change a prompt without touching feature code.
- `/db` — Schema + all queries together. No raw SQL scattered around the codebase.
- `/types` — Single source of truth for all data shapes across frontend and backend.
- `/hooks` — Client-side state management for async operations.

---

## 4. 🗄️ Database Schema

```sql
-- /db/schema.sql
-- Paste and run this in Supabase SQL Editor

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  github_avatar TEXT,
  email TEXT,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  default_branch TEXT DEFAULT 'main',
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, full_name)
);

CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  file_tree JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE readmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id),
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  pr_url TEXT,
  pr_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  drift_score INTEGER NOT NULL,
  status TEXT NOT NULL,
  drift_data JSONB NOT NULL,
  readme_id UUID REFERENCES readmes(id),
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE readmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_logs ENABLE ROW LEVEL SECURITY;
```

---

## 5. 🔧 Feature Breakdown

---

### Feature 1: 🔥 Roast My README

**Goal:** Public zero-login tool. Viral entry point. No DB writes.

**User Flow:**
1. User lands on `/`
2. Pastes any public GitHub repo URL
3. Clicks "Roast It 🔥"
4. Sees letter grade + specific issues in ~5 seconds
5. CTA: "Fix this automatically →" → sign in + full product

**Backend Logic (`/api/roast/route.ts`):**
1. Validate URL (client-side first: must match `github.com/{owner}/{repo}`)
2. Extract owner/repo with regex: `/github\.com\/([^\/]+)\/([^\/]+)/`
3. Fetch README: `GET https://api.github.com/repos/{owner}/{repo}/readme` with header `Accept: application/vnd.github.raw+json`
4. Build roast prompt → call Gemini → parse JSON response
5. Rate limit: 10 requests per IP per hour
6. Return `RoastResult`

**Frontend UI:**
- Hero: bold headline + URL input + "Roast It 🔥" button
- Loading: skeleton with "Reading your README..."
- Result: large letter grade (color coded A=green → F=red) + score + summary + issues list
- Share button: copy URL with `?score=B&repo=owner/repo` params
- CTA card: "Let AI fix this in 60 seconds →"
- Below fold: 3-step "How it works" explainer

**Edge Cases:**
- Private repo → "This repo is private. Sign in to analyze private repos."
- No README → grade F, top issue: "No README.md found in this repository."
- Invalid URL → client-side validation, never hits API
- GitHub rate limit (60 req/hr unauthenticated) → catch 403 → "GitHub rate limit reached. Try again shortly."

---

### Feature 2: 🧠 GitHub Repo Analyzer

**Goal:** Read actual repo code and extract structured technical context. Foundation for all other features.

**User Flow:**
1. Authenticated user opens `/repo/{owner}/{repo}`
2. Clicks "Analyze Repo" (or auto-triggers if never analyzed)
3. Sees named progress steps animate in real time
4. Analysis completes → stored in DB → README generation starts automatically

**Backend Logic (`/api/analyze/route.ts`):**
1. Auth check — 401 if no session
2. Receive `{ owner, repo }`
3. Upsert repo in `repos` table
4. Fetch file tree: `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1`
5. Identify key files to fetch (priority order, max 20 files total):
   - Manifest: `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod`
   - Environment: `.env.example` / `.env.sample` / `.env.template`
   - Entry point: `src/index.*` / `app/main.*` / `cmd/main.*` / `main.*`
   - Routes: files matching `*route*` / `*router*` / `urls.py`
   - Config: `Dockerfile` / `docker-compose.yml` / `.github/workflows/*.yml`
   - Docs: `README.md` (existing)
6. Fetch each file, truncate to 300 lines
7. Build prompt input → call Gemini → parse `RepoAnalysis` JSON
8. Save to `analyses` table + update `repos.last_analyzed_at`
9. Return `{ analysisId, analysis }`

**Edge Cases:**
- No manifest → infer language from file extensions
- Repo > 5000 files → traverse top 2 directory levels only
- File fetch 404 → skip, continue with available data
- Gemini JSON parse failure → strip backticks, retry once with stricter prompt instruction
- Re-analysis → create new `analyses` row, keep full history

---

### Feature 3: ⚡ Smart README Generator

**Goal:** Use `RepoAnalysis` to produce README with real function names, real commands, real env vars.

**User Flow:**
1. Auto-triggers after analysis completes (or manual "Generate" button)
2. ~8–15 second generation
3. Split view: editable raw markdown (left) + live rendered preview (right)
4. User can edit, copy, download, or raise a PR

**Backend Logic (`/api/generate/route.ts`):**
1. Auth check
2. Receive `{ repoId, analysisId }`
3. Fetch `RepoAnalysis` from DB
4. Build generation prompt → call Gemini → receive raw markdown
5. Strip any backtick wrappers from response
6. Get current max version for this repo → increment
7. Save to `readmes` table
8. Return `{ readmeId, content, version }`

**Frontend UI:**
- Left pane: editable `<textarea>` (monospace font)
- Right pane: `<ReactMarkdown remark-gfm>` rendered preview
- Sync: re-render on textarea change (debounced 300ms)
- Buttons: Copy | Download `README.md` | Regenerate
- Version badge: "Version 3 — 2 minutes ago"
- "Raise PR →" button at bottom

**Edge Cases:**
- Gemini wraps output in backticks → strip before saving
- Minimal analysis (empty repo) → generate skeleton with `[TODO]` placeholders
- User edits → save on textarea blur, not every keystroke
- Multiple versions → version switcher dropdown

---

### Feature 4: 🤖 Auto PR Creation

**Goal:** Raise a real GitHub PR with the generated README. Most impressive feature for a resume/portfolio.

**User Flow:**
1. User clicks "Raise PR 🚀" button in ReadmeEditor
2. Modal opens: branch name + PR title + PR description (all pre-filled, all editable)
3. User clicks "Create PR"
4. Step indicators: "Creating branch... Uploading file... Opening PR..."
5. Success: PR URL + "View on GitHub →" link
6. PR URL saved to DB

**Backend Logic (`/api/pr/route.ts`):**
1. Auth check
2. Receive `{ repoId, readmeId, branchName, prTitle, prBody }`
3. Fetch repo + README content + user access token from DB
4. **Step 1 — Get default branch SHA:**
   `GET /repos/{owner}/{repo}/git/ref/heads/{defaultBranch}` → extract SHA
5. **Step 2 — Create new branch:**
   `POST /repos/{owner}/{repo}/git/refs`
   Body: `{ ref: "refs/heads/{branchName}", sha: "{defaultBranchSHA}" }`
6. **Step 3 — Get existing README SHA (if file exists):**
   `GET /repos/{owner}/{repo}/contents/README.md` → extract SHA
7. **Step 4 — Create or update README on new branch:**
   `PUT /repos/{owner}/{repo}/contents/README.md`
   Body: `{ message: "docs: update README via RepoDoc", content: base64(readmeContent), branch: branchName, sha: existingFileSHA (if exists) }`
8. **Step 5 — Create PR:**
   `POST /repos/{owner}/{repo}/pulls`
   Body: `{ title, body: prBody + footer, head: branchName, base: defaultBranch }`
9. Save `pr_url` + `pr_number` to `readmes` table
10. Return `{ prUrl, prNumber }`

**Edge Cases:**
- Branch already exists → append `-{unix_timestamp}` to name, retry once
- README.md doesn't exist → omit `sha` from PUT body (creates new file)
- Token lacks `repo` write scope → "Reconnect GitHub with write permissions to create PRs."
- PR already open for this branch → surface GitHub error clearly

---

### Feature 5: 🔄 Doc Drift Detection + History

**Goal:** Monitor documentation staleness. Show history chart. Create returning users.

**User Flow:**
1. User clicks "Check Drift" on repo workspace
2. System re-runs analysis, compares to last saved analysis
3. Drift report: score + changed items + recommendation
4. User visits `/repo/{owner}/{repo}/history` for full score chart
5. CTA: "Regenerate README" if drift is significant

**Backend Logic (`/api/drift/route.ts`):**
1. Auth check
2. Receive `{ repoId }`
3. Fetch most recent analysis from DB
4. If none → return `{ status: 'no_baseline', message: 'Analyze your repo first to enable drift detection.' }`
5. Run new analysis (same logic as Feature 2)
6. Fetch current README content from DB
7. Build drift prompt with old + new analysis + current README
8. Call Gemini → parse `DriftReport` JSON
9. Save to `drift_logs` table
10. Return `DriftReport`

**Backend Logic (`/api/drift/history/route.ts`):**
1. Auth check
2. Receive `{ repoId }` from query params
3. Query all `drift_logs` for this repo ordered by `checked_at` ASC
4. Return `{ date: checked_at, score: drift_score, status }[]`

**Frontend (`DriftPanel.tsx`):**
- Large drift score with color (≥80 green, 60–79 yellow, 40–59 orange, <40 red)
- Status badge: "In Sync" / "Minor Drift" / "Moderate Drift" / "Major Drift"
- Summary sentence
- Changed items list: category tag + severity badge + what changed
- "Regenerate README" CTA if score < 80

**Frontend (`DriftChart.tsx`):**
- `recharts` LineChart
- X-axis: check date | Y-axis: drift score 0–100
- Horizontal reference lines at 80 (green), 60 (yellow), 40 (orange)
- Custom tooltip showing score + status on hover
- Empty state: "Run your first drift check to start tracking"

**Edge Cases:**
- No changes since last analysis → score 100, message: "Fully in sync. Your README accurately reflects your code."
- Drift check same day multiple times → save all, show all in chart
- Repo 404 on re-analysis → show error, preserve last known score

---

## 6. 🧠 AI Prompts

---

### Prompt 1: Roast My README

```typescript
// /prompts/roast.ts
export function buildRoastPrompt(readmeContent: string, repoName: string): string {
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
```

---

### Prompt 2: Repo Analysis

```typescript
// /prompts/analyze.ts
export function buildAnalyzePrompt(input: AnalysisPromptInput): string {
  return `
You are a senior engineer analyzing a GitHub repository to extract structured technical context for documentation generation.

Repository: ${input.repoName}

File tree (first 100 paths):
${input.fileTree.slice(0, 100).join('\n')}

Key file contents:
=== package.json / manifest ===
${input.manifest || 'not found'}

=== .env.example ===
${input.envExample || 'not found'}

=== Entry point ===
${input.entryPoint ? input.entryPoint.slice(0, 500) : 'not found'}

=== Dockerfile ===
${input.dockerfile || 'not found'}

=== CI config ===
${input.ciConfig || 'not found'}

Detected file extensions: ${input.detectedExtensions.join(', ')}

Rules:
- Use ONLY information visible above
- For missing data use null — never guess
- Detect API routes only if route files were provided above

Return ONLY valid JSON. No explanation. No markdown fences. No backticks.

{
  "project_name": "exact repo name",
  "description": "1–2 sentence technical description based strictly on code above",
  "tech_stack": ["TypeScript", "Next.js", "PostgreSQL"],
  "framework": "Next.js or null",
  "language": "TypeScript",
  "package_manager": "npm",
  "scripts": {
    "install": "npm install or null",
    "dev":     "npm run dev or null",
    "build":   "npm run build or null",
    "test":    "npm test or null",
    "start":   "npm start or null"
  },
  "env_variables": ["DATABASE_URL", "NEXTAUTH_SECRET"],
  "key_dependencies": ["next", "react", "prisma"],
  "has_docker": true,
  "has_ci": true,
  "has_tests": true,
  "entry_point": "src/index.ts",
  "api_routes": ["GET /api/users", "POST /api/auth/login"],
  "project_type": "web-app",
  "notable_features": ["JWT authentication", "REST API"],
  "prerequisites": ["Node.js >= 18", "PostgreSQL"]
}
`.trim();
}
```

---

### Prompt 3: README Generator

```typescript
// /prompts/generate.ts
export function buildGeneratePrompt(analysis: RepoAnalysis): string {
  return `
You are a world-class technical writer. Generate a professional README.md.
Use ONLY the data provided. Do NOT invent features, commands, or dependencies.

Project Analysis:
${JSON.stringify(analysis, null, 2)}

STRICT RULES:
- Use ONLY real data from the analysis above
- If a field is null or empty array, OMIT that entire section
- Use EXACT command strings from scripts object
- List ONLY env_variables that appear in the analysis
- Write in second person ("Run..." not "You should run...")
- Every sentence must add information — zero filler

Section order (skip any section where data is unavailable):
1. # Project Name — one-line description
2. Badges (ONLY if has_ci=true OR has_docker=true)
3. ## About — 2–3 sentences max
4. ## Tech Stack — bullet list
5. ## Prerequisites — list from prerequisites field
6. ## Installation — numbered steps with real commands
7. ## Environment Variables — table: | Variable | Description |
8. ## Usage — exact command from scripts.start or scripts.dev
9. ## API Routes — table: | Method | Endpoint | Description | (ONLY if api_routes non-empty)
10. ## Running Tests — exact command (ONLY if has_tests=true)
11. ## Docker — build + run (ONLY if has_docker=true)
12. ## Contributing — standard 3-sentence section
13. ## License — MIT

Return ONLY raw markdown. No explanation. No backticks wrapping the output.
`.trim();
}
```

---

### Prompt 4: Drift Detection

```typescript
// /prompts/drift.ts
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
```

---

## 7. 🧩 Step-by-Step Task Plan

---

### Phase 0: Foundation (2 days)

- [ ] **Task 0.1: Initialize project**
  ```bash
  npx create-next-app@latest repodoc --typescript --tailwind --app
  cd repodoc
  ```
  **Verify:** `npm run dev` → localhost:3000 loads

- [ ] **Task 0.2: Install dependencies**
  ```bash
  npm install next-auth @auth/core octokit
  npm install @google/generative-ai
  npm install @supabase/supabase-js
  npm install react-markdown remark-gfm recharts
  npm install lucide-react clsx tailwind-merge
  npx shadcn-ui@latest init
  npx shadcn-ui@latest add button card badge input textarea dialog toast
  ```
  **Verify:** `npm run dev` with no errors

- [ ] **Task 0.3: Supabase setup**
  - Create project at supabase.com
  - SQL Editor → run `schema.sql`
  - Copy Project URL + anon key + service role key
  **Verify:** All 5 tables visible in Table Editor

- [ ] **Task 0.4: GitHub OAuth App**
  - GitHub → Settings → Developer Settings → OAuth Apps → New
  - Callback: `http://localhost:3000/api/auth/callback/github`
  - Scopes to request: `read:user user:email repo`
  **Verify:** Client ID + Secret available

- [ ] **Task 0.5: Configure `.env.local`**
  ```env
  NEXTAUTH_SECRET=                     # openssl rand -base64 32
  NEXTAUTH_URL=http://localhost:3000
  GITHUB_CLIENT_ID=
  GITHUB_CLIENT_SECRET=
  GEMINI_API_KEY=
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```

- [ ] **Task 0.6: Configure NextAuth**
  - Create `/app/api/auth/[...nextauth]/route.ts`
  - GitHub provider, `repo` scope
  - `signIn` callback: upsert user + save access token to Supabase
  **Verify:** Sign in → session exists → user row in Supabase

- [ ] **Task 0.7: Create middleware**
  - Protect `/dashboard` and `/repo` routes
  **Verify:** `/dashboard` without auth → redirects to signin

- [ ] **Task 0.8: Create all types**
  - Create `/types/index.ts` — all interfaces from Appendix
  **Verify:** TypeScript compiles cleanly

- [ ] **Task 0.9: Create Supabase clients**
  - `/lib/supabase.ts` — server client (service role) + browser client (anon)
  **Verify:** Test query from API route returns data

- [ ] **Task 0.10: Create DB query functions**
  - `/db/queries.ts` — `upsertUser`, `upsertRepo`, `saveAnalysis`, `getLatestAnalysis`, `saveReadme`, `getLatestReadme`, `updateReadmePR`, `saveDriftLog`, `getDriftHistory`
  **Verify:** Each function has correct TypeScript signature

---

### Phase 1: Roast My README (2 days)

- [ ] **Task 1.1: Create Gemini client**
  - `/lib/gemini.ts`
  - 10 second timeout on all calls
  - `parseJSON<T>(text: string): T` helper that strips backticks before parsing
  - Export `generateText(prompt: string): Promise<string>`
  **Verify:** Test call returns text from Gemini

- [ ] **Task 1.2: Create rate limiter**
  - `/utils/rate-limit.ts`
  - In-memory `Map<ip, timestamp[]>`
  - `checkRateLimit(ip, max, windowMs): boolean`
  **Verify:** Returns false after max calls in window

- [ ] **Task 1.3: Create roast API route**
  - `/app/api/roast/route.ts`
  - Rate limit → parse URL → fetch README → Gemini → return JSON
  **Verify:**
  ```bash
  curl -X POST localhost:3000/api/roast \
    -H "Content-Type: application/json" \
    -d '{"repoUrl":"https://github.com/facebook/react"}'
  ```
  Returns valid `RoastResult` JSON

- [ ] **Task 1.4: Build RoastInput component**
  - URL input + validation + loading state + error state
  **Verify:** Validates URL, calls API, shows spinner

- [ ] **Task 1.5: Build RoastResult component**
  - Grade (large, color-coded) + score + summary + criteria + issues
  - Share button + "Fix this →" CTA
  **Verify:** Renders all states with mock data

- [ ] **Task 1.6: Build landing page**
  - `/app/page.tsx`: hero + RoastInput + 3-step explainer
  **Verify:** Full roast flow end-to-end in browser

---

### Phase 2: Analyzer + Dashboard (3 days)

- [ ] **Task 2.1: Create GitHub client**
  - `/lib/github.ts`
  - `getOctokit(token)` factory
  - `getUserRepos(token)` → `GitHubRepo[]`
  - `getRepoTree(token, owner, repo)` → `string[]`
  - `getFileContent(token, owner, repo, path)` → `string | null`
  - `getDefaultBranch(token, owner, repo)` → `string`
  **Verify:** `getUserRepos` returns real repos in console

- [ ] **Task 2.2: Create analyzer logic**
  - `/lib/analyzer.ts`
  - `analyzeRepo(token, owner, repo): Promise<RepoAnalysis>`
  - Fetch tree → identify key files → fetch content → build prompt → call Gemini → parse
  **Verify:** Returns full `RepoAnalysis` for a test repo

- [ ] **Task 2.3: Create analyze API route**
  - Auth guard → upsert repo → run analysis → save to DB → return
  **Verify:** Returns analysis JSON + new row in `analyses` table

- [ ] **Task 2.4: Create repos API route**
  - `/app/api/repos/route.ts`
  - Fetch GitHub repos + enrich with `last_analyzed_at` from DB
  **Verify:** Returns enriched repo list

- [ ] **Task 2.5: Build AnalysisProgress component**
  - 5 named steps with check animations
  - Show "Reading N files..."
  **Verify:** Steps animate during a real analysis run

- [ ] **Task 2.6: Build RepoCard component**
  - Name + visibility badge + last analyzed date + drift score badge
  **Verify:** Renders correctly with mock data

- [ ] **Task 2.7: Build dashboard page**
  - `/app/dashboard/page.tsx`
  - Fetch repos → grid of RepoCards
  - Click card → navigate to `/repo/{owner}/{repo}`
  **Verify:** Real repos from GitHub shown after login

---

### Phase 3: README Generator (2 days)

- [ ] **Task 3.1: Create generator logic**
  - `/lib/generator.ts`
  - `generateReadme(analysis: RepoAnalysis): Promise<string>`
  - Strip backtick wrappers from Gemini output
  **Verify:** Returns clean markdown string

- [ ] **Task 3.2: Create generate API route**
  - Auth guard → fetch analysis from DB → generate → increment version → save readme → return
  **Verify:** Returns markdown + new row in `readmes` table with correct version

- [ ] **Task 3.3: Build ReadmeEditor component**
  - Split pane: `<textarea>` left + `<ReactMarkdown>` right
  - Sync on change (debounced 300ms)
  - Copy | Download | Regenerate buttons
  - Version badge + switcher
  **Verify:** Edit left → preview updates right. Copy/download work.

- [ ] **Task 3.4: Build repo workspace page**
  - `/app/repo/[owner]/[repo]/page.tsx`
  - Auto-trigger analysis if never analyzed
  - Auto-trigger generation after analysis
  - Compose: AnalysisProgress + ReadmeEditor + PrCreator + DriftPanel
  **Verify:** Full flow: open repo page → auto-analyze → auto-generate → see README

---

### Phase 4: Auto PR Creation (2 days)

- [ ] **Task 4.1: Add GitHub write operations to client**
  - Add to `/lib/github.ts`:
  - `getBranchSHA(token, owner, repo, branch)` → SHA
  - `createBranch(token, owner, repo, branchName, sha)` → void
  - `getFileSHA(token, owner, repo, path)` → SHA | null
  - `createOrUpdateFile(token, owner, repo, path, content, message, branch, sha?)` → void
  - `createPR(token, owner, repo, title, body, head, base)` → `{ url, number }`
  **Verify:** Each function works in isolation with test calls

- [ ] **Task 4.2: Create PR API route**
  - `/app/api/pr/route.ts`
  - Chain all 5 GitHub operations in sequence
  - Handle branch name conflicts (append timestamp)
  - Save PR URL + number to DB
  **Verify:** Creates real PR on a test private repo

- [ ] **Task 4.3: Build PrCreator component**
  - "Raise PR 🚀" trigger button
  - Modal: branch name + PR title + PR description (all editable)
  - Step indicators: "Creating branch... Uploading... Opening PR..."
  - Success: PR URL link
  - Error: exact GitHub error message
  **Verify:** Full PR creation flow works end-to-end

---

### Phase 5: Drift Detection + History (2 days)

- [ ] **Task 5.1: Create drift logic**
  - `/lib/drift.ts`
  - `detectDrift(snapshot, current, readme): Promise<DriftReport>`
  - Pre-compute structured diff before sending to Gemini (reduces prompt noise)
  **Verify:** Returns valid `DriftReport` with real changes detected

- [ ] **Task 5.2: Create drift API route**
  - Fetch latest analysis → re-run analysis → detect drift → save log → return
  **Verify:** Returns drift report + row in `drift_logs`

- [ ] **Task 5.3: Create drift history API route**
  - Query all drift logs for repo ordered by date ASC
  **Verify:** Returns array of `{ date, score, status }`

- [ ] **Task 5.4: Build DriftPanel component**
  - Score + status + summary + changed items + CTA
  **Verify:** All states render correctly

- [ ] **Task 5.5: Build DriftChart component**
  - `recharts` LineChart with reference lines + tooltip
  - Empty state
  **Verify:** Chart renders with mock time-series data

- [ ] **Task 5.6: Build drift history page**
  - `/app/repo/[owner]/[repo]/history/page.tsx`
  - Chart + data table below
  **Verify:** Shows real historical data after 2+ drift checks

---

### Phase 6: Polish + Production (2 days)

- [ ] **Task 6.1:** Wrap all async UI in `<Suspense>` + error boundaries
- [ ] **Task 6.2:** Skeleton loaders for all data-fetching components
- [ ] **Task 6.3:** Responsive layout (mobile → desktop breakpoints)
- [ ] **Task 6.4:** Build Navbar (logo + auth state + sign out)
- [ ] **Task 6.5:** Add `metadata` to all `page.tsx` files (title, description, OG)
- [ ] **Task 6.6:** Deploy to Vercel (`vercel --prod`)
- [ ] **Task 6.7:** Add all env vars to Vercel dashboard
- [ ] **Task 6.8:** Update GitHub OAuth callback URL to production domain
- [ ] **Task 6.9:** Add production domain to Supabase allowed CORS origins
- [ ] **Task 6.10:** Run full flow on production URL end-to-end

---

## 8. 🚨 Failure Handling

### GitHub API

| Scenario | Handler |
|---|---|
| 404 — README not found (roast) | Return grade F: "No README.md found" |
| 403 — Unauthenticated rate limit | "GitHub rate limit reached. Try again shortly." |
| 401 — Token expired | Clear session, return 401, redirect to signin |
| 422 — Branch already exists (PR) | Append `-{Date.now()}` to branch name, retry once |
| 403 — Insufficient token scope (PR) | "Reconnect GitHub with write permissions to create PRs." |

### Gemini API

| Scenario | Handler |
|---|---|
| Timeout (> 10s) | Return 504: "AI analysis timed out. Please try again." |
| Invalid JSON | Strip backticks → retry `JSON.parse` → if still fails, return 500 |
| Empty response | Retry once → if still empty, return 500 |
| Token limit exceeded | Truncate files to 200 lines, tree to 50 paths, retry |

### Database

| Scenario | Handler |
|---|---|
| Connection error | Log server-side, return 500: "Service temporarily unavailable." |
| Insert conflict | Use `UPSERT` / `ON CONFLICT DO UPDATE` for all inserts |
| Query returns null | Return empty state to UI — never throw on missing data |

---

## 9. 🎯 MVP vs V2

### ✅ MVP — This PRD

| Feature | Notes |
|---|---|
| Roast My README (public) | No auth required |
| GitHub OAuth + user persistence | Supabase `users` table |
| Repo Analyzer | Max 20 files, structured output |
| Smart README Generator | Versioned, editable, download |
| Auto PR Creation | Real branch + PR via GitHub API |
| Doc Drift Detection | Manual trigger, saved to DB |
| Drift History Chart | recharts line chart |
| Production deployment | Vercel + Supabase |

### 🚫 V2 — Do Not Build Yet

| Feature | Why later |
|---|---|
| GitHub App (webhooks) | Requires GitHub App review + org installation flow |
| Email drift alerts | Needs email service + user preferences + unsubscribe |
| Multi-doc generation | Perfect paid upgrade. Build after core retention is proven. |
| Stripe / payments | No users yet. Build after 30-day retention data exists. |
| Team / org accounts | Requires multi-tenancy in DB schema |
| CLI tool | Build after web product proves value |
| VS Code extension | Lower distribution ROI than GitHub App |
| AI model fine-tuning | Requires accumulated usage data you don't have yet |

---

## 10. 📋 Appendix: Full Type Definitions

```typescript
// /types/index.ts

export interface RoastResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  summary: string;
  criteria: {
    clarity:      { score: number; issue: string | null };
    setup:        { score: number; issue: string | null };
    usage:        { score: number; issue: string | null };
    structure:    { score: number; issue: string | null };
    completeness: { score: number; issue: string | null };
    specificity:  { score: number; issue: string | null };
  };
  top_issues: string[];
}

export interface RepoAnalysis {
  project_name: string;
  description: string;
  tech_stack: string[];
  framework: string | null;
  language: string;
  package_manager: string;
  scripts: {
    install: string | null;
    dev:     string | null;
    build:   string | null;
    test:    string | null;
    start:   string | null;
  };
  env_variables: string[];
  key_dependencies: string[];
  has_docker: boolean;
  has_ci: boolean;
  has_tests: boolean;
  entry_point: string;
  api_routes: string[];
  project_type: 'web-app' | 'cli' | 'library' | 'api' | 'mobile' | 'other';
  notable_features: string[];
  prerequisites: string[];
}

export interface DriftReport {
  drift_score: number;
  status: 'in-sync' | 'minor-drift' | 'moderate-drift' | 'major-drift';
  summary: string;
  changed_items: Array<{
    category: 'dependency' | 'env-var' | 'script' | 'api-route' | 'feature' | 'stack';
    change: string;
    readme_impact: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  sections_to_update: string[];
  recommendation: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  is_private: boolean;
  default_branch: string;
  description: string | null;
  updated_at: string;
}

export interface DriftHistoryPoint {
  date: string;
  score: number;
  status: DriftReport['status'];
}

export interface AnalysisPromptInput {
  repoName: string;
  fileTree: string[];
  manifest: string | null;
  envExample: string | null;
  entryPoint: string | null;
  dockerfile: string | null;
  ciConfig: string | null;
  detectedExtensions: string[];
}

export interface DriftPromptInput {
  repoName: string;
  snapshot: RepoAnalysis;
  current: RepoAnalysis;
  currentReadme: string;
  daysSinceSnapshot: number;
}
```

---

## 11. 🌐 Deployment Checklist

### Pre-deploy
- [ ] All `process.env.*` vars present and typed
- [ ] No hardcoded secrets anywhere in codebase
- [ ] `npm run build` passes with zero errors
- [ ] All API routes handle auth failure (no 500s on missing session)

### Vercel
- [ ] `vercel --prod`
- [ ] Add all env vars in Vercel dashboard (Settings → Environment Variables)
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Enable preview deployments

### Supabase
- [ ] Add production domain to allowed CORS origins (Settings → API)
- [ ] Confirm all 5 tables have RLS enabled
- [ ] Enable automatic daily backups

### GitHub OAuth
- [ ] Update Homepage URL to production domain
- [ ] Update callback: `https://yourdomain.vercel.app/api/auth/callback/github`

### Post-deploy verification
- [ ] Roast tool works (no auth, public repo URL)
- [ ] GitHub OAuth sign-in creates user in Supabase
- [ ] Repo analysis runs and saves to DB
- [ ] README generation returns correct output
- [ ] PR creation raises real PR on test repo
- [ ] Drift check runs and saves to `drift_logs`
- [ ] History chart renders with real data points

---

*PRD Version 2.0 — RepoDoc — Resume/Portfolio Quality*
*Features: Roast + Analyzer + Generator + Auto PR + Drift Detection + History Chart*
*Stack: Next.js 14 + TypeScript + Tailwind + Supabase + Gemini + GitHub OAuth*