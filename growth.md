# RepoDoc — Post-Build Growth & Infrastructure Task List
## Execution Plan: From Tool → Real SaaS

> Version: 1.0 | Phase: Post-MVP Launch | Goal: Real users, real retention, real revenue

---

## 🗺️ Overview

Your product works. That's the hard part done.
Now the job changes from **building** to **embedding** — getting RepoDoc into workflows it cannot be removed from.

This document covers exactly what to do, in what order, and how to verify each task is done.

**The 3-week north star:**
- Week 1 → Make it infrastructure (GitHub App + Docs CI)
- Week 2 → Get it in front of people (Product Hunt launch)
- Week 3 → Get real feedback from real users (OSS maintainer outreach)

---

## 📅 WEEK 1: Make It Infrastructure

---

### DAY 1–3: GitHub App Development

**Why this is first:**
OAuth App = user manually uses your tool.
GitHub App = installed once, runs forever on every push.
This single change transforms RepoDoc from a tool into infrastructure.

---

#### Day 1 — GitHub App Setup & Registration

- [ ] **Task 1.1: Register GitHub App**
  - Go to: GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App
  - Fill in:
    - App name: `RepoDoc`
    - Homepage URL: `https://repodoc.vercel.app`
    - Webhook URL: `https://repodoc.vercel.app/api/webhooks/github` (set up in Task 1.4)
    - Webhook secret: generate with `openssl rand -base64 32` → save to `.env`
  - Permissions required:
    - Repository → Contents: `Read & Write` (read files, create branches, push README)
    - Repository → Pull Requests: `Read & Write` (create PRs)
    - Repository → Metadata: `Read` (repo info)
    - Repository → Checks: `Read & Write` (for Docs CI in Day 4)
  - Subscribe to events:
    - ✅ Push
    - ✅ Pull request
    - ✅ Installation
    - ✅ Installation repositories
  - **Expected output:** GitHub App ID + private key (.pem file) + webhook secret
  - **Verify:** App appears in your GitHub Developer Settings

- [ ] **Task 1.2: Add GitHub App env vars**
  ```env
  GITHUB_APP_ID=
  GITHUB_APP_PRIVATE_KEY=          # Full contents of .pem file (replace newlines with \n)
  GITHUB_APP_WEBHOOK_SECRET=
  GITHUB_APP_CLIENT_ID=            # Different from OAuth App
  GITHUB_APP_CLIENT_SECRET=        # Different from OAuth App
  ```
  **Verify:** All vars accessible in `process.env`

- [ ] **Task 1.3: Install Octokit App SDK**
  ```bash
  npm install @octokit/app @octokit/webhooks @octokit/auth-app
  ```
  **Verify:** `npm run dev` still works

- [ ] **Task 1.4: Create GitHub App client**
  - Create `/lib/github-app.ts`
  - Initialize `App` from `@octokit/app` with App ID + private key
  - Export `getInstallationOctokit(installationId: number)` — returns authenticated Octokit for a specific repo installation
  - Export `getAppOctokit()` — returns app-level Octokit (for listing installations)
  ```typescript
  import { App } from '@octokit/app';

  const app = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    webhooks: { secret: process.env.GITHUB_APP_WEBHOOK_SECRET! },
  });

  export async function getInstallationOctokit(installationId: number) {
    return app.getInstallationOctokit(installationId);
  }
  ```
  **Verify:** `getInstallationOctokit` returns Octokit without throwing

- [ ] **Task 1.5: Add `installations` table to Supabase**
  ```sql
  CREATE TABLE installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    installation_id BIGINT UNIQUE NOT NULL,   -- GitHub's installation ID
    account_login TEXT NOT NULL,              -- GitHub username or org name
    account_type TEXT NOT NULL,               -- 'User' or 'Organization'
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    uninstalled_at TIMESTAMPTZ               -- null = still active
  );

  ALTER TABLE repos ADD COLUMN installation_id BIGINT;
  ALTER TABLE repos ADD COLUMN webhook_active BOOLEAN DEFAULT FALSE;

  ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
  ```
  **Verify:** New table and columns visible in Supabase Table Editor

---

#### Day 2 — Webhook Handler

- [ ] **Task 2.1: Create webhook API route**
  - Create `/app/api/webhooks/github/route.ts`
  - This is the URL GitHub calls when events happen
  - Verify webhook signature on every request (security — reject if signature invalid)
  ```typescript
  import { createHmac } from 'crypto';

  function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return digest === signature;
  }
  ```
  **Verify:** Webhook URL returns 200 for a valid ping event from GitHub

- [ ] **Task 2.2: Handle `installation` event**
  - When a user installs your GitHub App on a repo:
    1. Parse `installation.id` + `installation.account.login` + `installation.account.type`
    2. Save to `installations` table
    3. For each repo in `installation.repositories`: upsert into `repos` table with `installation_id`
  ```typescript
  // Event: installation.created
  async function handleInstallation(payload: any) {
    const { installation, repositories } = payload;
    await saveInstallation({
      installation_id: installation.id,
      account_login: installation.account.login,
      account_type: installation.account.type,
    });
    for (const repo of repositories || []) {
      await upsertRepo({ full_name: repo.full_name, installation_id: installation.id });
    }
  }
  ```
  **Verify:** Install your App on a test repo → row appears in `installations` table

- [ ] **Task 2.3: Handle `push` event**
  - When code is pushed to a repo where your App is installed:
    1. Extract `repository.full_name` + `commits` (list of changed files)
    2. Fetch latest analysis from DB for this repo
    3. If no analysis exists → skip (user hasn't used RepoDoc yet)
    4. Check if any changed files overlap with documented areas (dependencies, routes, env)
    5. If overlap: trigger drift check, save result
    6. If drift score < 80: create a GitHub Check Run with warning status
  ```typescript
  // Event: push
  async function handlePush(payload: any) {
    const { repository, commits } = payload;
    const changedFiles = commits.flatMap((c: any) => [...c.added, ...c.modified, ...c.removed]);

    const analysis = await getLatestAnalysis(repository.full_name);
    if (!analysis) return; // not yet set up with RepoDoc

    const docRelevantFiles = ['package.json', '.env', 'requirements.txt', 'Cargo.toml', 'go.mod'];
    const hasDocRelevantChange = changedFiles.some((f: string) =>
      docRelevantFiles.some(d => f.includes(d))
    );

    if (hasDocRelevantChange) {
      // trigger background drift check
      await triggerDriftCheck(repository.full_name);
    }
  }
  ```
  **Verify:** Push to test repo → drift check runs → row saved in `drift_logs`

- [ ] **Task 2.4: Handle `pull_request` event**
  - When a PR is opened or updated:
    1. Get list of changed files in the PR
    2. Check if any match documentation-relevant patterns
    3. If yes: post a PR comment with drift warning
  ```typescript
  // Event: pull_request.opened / pull_request.synchronize
  async function handlePullRequest(payload: any) {
    const { pull_request, repository, installation } = payload;
    const octokit = await getInstallationOctokit(installation.id);

    // Get changed files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pull_request.number,
    });

    const changedPaths = files.map(f => f.filename);
    const docFiles = ['package.json', 'requirements.txt', '.env.example', 'Dockerfile'];
    const affected = changedPaths.filter(p => docFiles.some(d => p.includes(d)));

    if (affected.length > 0) {
      await octokit.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pull_request.number,
        body: `## 📄 RepoDoc: Documentation Check\n\nThis PR modifies \`${affected.join('`, `')}\` which may affect your README accuracy.\n\n[Review suggested documentation updates →](https://repodoc.vercel.app/repo/${repository.full_name})\n\n---\n*[RepoDoc](https://repodoc.vercel.app) — Self-healing documentation for GitHub repos*`,
      });
    }
  }
  ```
  **Verify:** Open a PR on test repo that touches package.json → bot comment appears

- [ ] **Task 2.5: Handle `installation.deleted` event**
  - Set `uninstalled_at` timestamp in `installations` table
  - Set `webhook_active = false` on affected repos
  **Verify:** Uninstall App from test repo → `uninstalled_at` set in DB

---

#### Day 3 — Install Flow UI

- [ ] **Task 3.1: Add "Install GitHub App" button to dashboard**
  - Show in dashboard header if no installation found for current user
  - Link: `https://github.com/apps/repodoc/installations/new`
  - After install: GitHub redirects back to your app with `installation_id` param
  **Verify:** Button appears, click redirects to GitHub App install page

- [ ] **Task 3.2: Handle post-install redirect**
  - Create `/app/install/callback/page.tsx`
  - GitHub redirects here after install with `?installation_id=XXX&setup_action=install`
  - Save `installation_id` to user record in DB
  - Show success state: "RepoDoc is now monitoring your repos 🎉"
  **Verify:** Complete install flow → lands on success page → installation saved in DB

- [ ] **Task 3.3: Show webhook status on repo cards**
  - Green dot: "Auto-monitoring active" (GitHub App installed)
  - Grey dot: "Manual checks only" (OAuth only, no App)
  - Upgrade CTA: "Enable auto-monitoring →" → links to App install
  **Verify:** Repo cards show correct status based on DB data

- [ ] **Task 3.4: Notification panel for drift alerts**
  - Add notification bell icon to Navbar
  - Query `drift_logs` for repos with `drift_score < 80` and `checked_at > 7 days ago`
  - Show: "⚠️ {repo_name} has drifted. [Review →]"
  **Verify:** After push triggers drift, notification appears in bell

---

### DAY 4–5: Docs CI GitHub Action

**Why this matters:**
A GitHub Action lives inside `.github/workflows/` — it's inside the repo itself. Every time it runs, RepoDoc gets an impression. When developers share their workflow files (which they do), your action gets distributed. This is your most viral surface.

---

#### Day 4 — Build the Action

- [ ] **Task 4.1: Create a new public GitHub repository**
  - Name: `repodoc/docs-check` (this is the Action's repo)
  - This is a separate repo from your main app
  - It will be the source for `uses: repodoc/docs-check@v1` in user workflows
  **Verify:** Public repo created at `github.com/repodoc/docs-check`

- [ ] **Task 4.2: Create the Action definition**
  - Create `action.yml` in the root of `repodoc/docs-check`:
  ```yaml
  name: 'RepoDoc Docs Check'
  description: 'Checks if your README is in sync with your code changes'
  branding:
    icon: 'book-open'
    color: 'blue'
  inputs:
    repo-token:
      description: 'GitHub token for posting comments'
      required: true
    repodoc-api-key:
      description: 'Your RepoDoc API key (from repodoc.vercel.app/settings)'
      required: true
    fail-on-drift:
      description: 'Fail the check if drift score is below threshold (default: false)'
      required: false
      default: 'false'
    drift-threshold:
      description: 'Drift score below which to warn (default: 70)'
      required: false
      default: '70'
  runs:
    using: 'node20'
    main: 'dist/index.js'
  ```
  **Verify:** `action.yml` is valid YAML

- [ ] **Task 4.3: Create Action logic (`src/index.ts`)**
  ```typescript
  import * as core from '@actions/core';
  import * as github from '@actions/github';

  async function run() {
    const repoToken = core.getInput('repo-token');
    const apiKey = core.getInput('repodoc-api-key');
    const failOnDrift = core.getInput('fail-on-drift') === 'true';
    const threshold = parseInt(core.getInput('drift-threshold'));

    const { owner, repo } = github.context.repo;
    const octokit = github.getOctokit(repoToken);

    core.info(`Running RepoDoc Docs Check for ${owner}/${repo}`);

    // Call your RepoDoc API
    const response = await fetch('https://repodoc.vercel.app/api/ci/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ owner, repo }),
    });

    const result = await response.json();

    core.info(`Drift score: ${result.drift_score}`);
    core.info(`Status: ${result.status}`);

    // Post PR comment if this is a PR event
    if (github.context.eventName === 'pull_request' && result.drift_score < threshold) {
      const prNumber = github.context.payload.pull_request?.number;
      if (prNumber) {
        await octokit.rest.issues.createComment({
          owner, repo,
          issue_number: prNumber,
          body: buildComment(result),
        });
      }
    }

    // Set output
    core.setOutput('drift-score', result.drift_score);
    core.setOutput('status', result.status);

    if (failOnDrift && result.drift_score < threshold) {
      core.setFailed(`Documentation drift detected. Score: ${result.drift_score}. Threshold: ${threshold}`);
    } else if (result.drift_score < threshold) {
      core.warning(`Documentation may be outdated. Drift score: ${result.drift_score}`);
    } else {
      core.info(`✅ Documentation is in sync. Score: ${result.drift_score}`);
    }
  }

  function buildComment(result: any): string {
    return `## 📄 RepoDoc: Documentation Health Check

  **Drift Score: ${result.drift_score}/100** — ${result.status.replace('-', ' ')}

  ${result.summary}

  ${result.changed_items?.length > 0 ? `### What may need updating:\n${result.changed_items.map((i: any) => `- **${i.readme_impact}**: ${i.change}`).join('\n')}` : ''}

  [Review and update documentation →](https://repodoc.vercel.app)

  ---
  *[RepoDoc](https://repodoc.vercel.app) — Self-healing documentation for GitHub repos*`;
  }

  run().catch(core.setFailed);
  ```

- [ ] **Task 4.4: Build and bundle the Action**
  ```bash
  npm install @actions/core @actions/github
  npm install --save-dev @vercel/ncc typescript
  npx tsc
  npx ncc build src/index.ts -o dist
  git add dist/
  git commit -m "build: bundle action"
  git tag -a v1 -m "v1.0.0"
  git push origin main --tags
  ```
  **Verify:** `dist/index.js` exists and is committed. Tag `v1` visible on GitHub.

- [ ] **Task 4.5: Create `/api/ci/check` route in main RepoDoc app**
  - Accept `Bearer` API key authentication (not OAuth session — CI environments need key auth)
  - Create `/app/api/ci/check/route.ts`
  - Validate API key against `users` table
  - Run drift check for the repo
  - Return `DriftReport` JSON
  **Verify:** `curl -X POST https://repodoc.vercel.app/api/ci/check -H "Authorization: Bearer {key}" -d '{"owner":"...","repo":"..."}'` returns drift report

---

#### Day 5 — API Keys + Action Distribution

- [ ] **Task 5.1: Add API key generation to user settings**
  - Add `api_key` column to `users` table:
    ```sql
    ALTER TABLE users ADD COLUMN api_key TEXT UNIQUE;
    ```
  - Generate on first visit to `/settings`: `crypto.randomUUID()` prefixed with `rd_`
  - Show once with copy button: "Your API key: `rd_xxxx...` — store this safely"
  **Verify:** API key generated, stored in DB, visible in settings

- [ ] **Task 5.2: Create `/settings` page**
  - Show API key (masked) with "Reveal" + "Regenerate" buttons
  - Show GitHub App installation status
  - Show connected repos list
  **Verify:** Page renders with real user data

- [ ] **Task 5.3: Write Action README for `repodoc/docs-check` repo**
  ```markdown
  # RepoDoc Docs Check

  Automatically checks if your README is in sync with your code on every PR.

  ## Usage

  \`\`\`yaml
  name: Docs Check
  on: [push, pull_request]
  jobs:
    docs:
      runs-on: ubuntu-latest
      steps:
        - uses: repodoc/docs-check@v1
          with:
            repo-token: ${{ secrets.GITHUB_TOKEN }}
            repodoc-api-key: ${{ secrets.REPODOC_API_KEY }}
  \`\`\`

  Add `REPODOC_API_KEY` to your repo secrets from repodoc.vercel.app/settings
  ```
  **Verify:** README renders cleanly on GitHub

- [ ] **Task 5.4: Create shareable workflow file snippet in RepoDoc UI**
  - After README is generated: show a "Enable Docs CI" card
  - One-click copy of the workflow YAML above (pre-filled with their repo)
  - Link to their settings page for API key
  **Verify:** Snippet appears in repo workspace, copies correctly

---

### DAY 6–7: Blog Post Distribution

**Why this matters:**
A blog post costs you one day. It can bring hundreds of users. It builds SEO. It positions you as an expert. This is the highest ROI marketing activity for a solo developer.

---

#### Day 6 — Run the Analysis + Write the Post

- [ ] **Task 6.1: Build a batch roast script**
  - Create a Node.js script: `/scripts/batch-roast.ts`
  - Hardcode 100 popular GitHub repo URLs (use GitHub trending, top starred repos by language)
  - Call your own `/api/roast` endpoint for each
  - Save results to a JSON file: `results.json`
  ```typescript
  // /scripts/batch-roast.ts
  const repos = [
    'https://github.com/vercel/next.js',
    'https://github.com/tailwindlabs/tailwindcss',
    // ... 98 more
  ];

  const results = [];
  for (const repo of repos) {
    const res = await fetch('https://repodoc.vercel.app/api/roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: repo }),
    });
    const data = await res.json();
    results.push({ repo, ...data });
    await new Promise(r => setTimeout(r, 1000)); // rate limit
  }

  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  ```
  **Verify:** `results.json` has 100 entries with grades and scores

- [ ] **Task 6.2: Analyze the results**
  From `results.json`, calculate:
  - Average score across all 100 repos
  - Distribution: how many A, B, C, D, F
  - Most common missing sections (from `criteria` breakdown)
  - Most common top issues
  - Surprising findings (famous repos with bad READMEs)
  **Expected output:** A set of 5–7 data points that are genuinely interesting

- [ ] **Task 6.3: Write the blog post**
  Platform: dev.to (free, high SEO, developer audience, syndicated)
  Also post on: Hashnode (auto-syncs to your own domain), Medium

  **Title options (pick one):**
  - "I roasted 100 GitHub READMEs with AI. The results were worse than expected."
  - "We analyzed 100 top GitHub repos. 73% have documentation problems."
  - "Why your README is probably lying to your users (with data)"

  **Structure:**
  1. Hook: one surprising data point in the first sentence
  2. What I built and why (3 sentences, link to RepoDoc)
  3. The methodology (transparent = trustworthy)
  4. The data (grade distribution chart, top 5 issues)
  5. Hall of shame: 3 famous repos with bad READMEs (specific and funny)
  6. Hall of fame: 3 repos that scored A (what they do right)
  7. What makes a perfect README (your rubric)
  8. CTA: "Roast your own README → repodoc.vercel.app"

  **Verify:** Post drafted, reviewed, ready to publish

---

#### Day 7 — Publish and Distribute

- [ ] **Task 7.1: Publish the blog post**
  - Publish on dev.to first (set canonical URL to your own domain if you have one)
  - Cross-post to Hashnode

- [ ] **Task 7.2: Post on social**
  Create separate posts for each platform (different formats, same content):

  **Twitter/X thread:**
  ```
  I analyzed 100 popular GitHub repos with AI.
  The average README score? C+.
  
  Here's what I found (with data) 🧵
  
  1/ The methodology: I built an AI tool that scores READMEs
  on 6 criteria...
  [link to blog post]
  ```

  **Reddit posts (post in all 3):**
  - r/programming — title: "I scored 100 popular GitHub READMEs with AI. Results were surprising."
  - r/webdev — same post
  - r/opensource — angle: "OSS documentation is broken. Here's the data."

  **Hacker News:**
  - Title: "Show HN: I built a tool to detect when your README goes out of sync with your code"
  - Post at 9am EST on a weekday (highest traffic time)
  - Be honest in the description — HN hates marketing speak

  **LinkedIn:**
  - Professional angle: "Documentation debt is real. Here's what AI analysis of 100 repos revealed."

- [ ] **Task 7.3: Post in relevant communities**
  - GitHub Discussions of popular tools you roasted (respectful, funny, not spam)
  - Discord servers: Theo's T3, Fireship, 100 Days of Code
  - Dev.to community posts tagging relevant topics

- [ ] **Task 7.4: Monitor and respond**
  - Check all platforms every 2 hours on day of posting
  - Respond to EVERY comment within the day (early engagement boosts algorithmic reach)
  - Save all feedback — it's free product research

---

## 📅 WEEK 2: Product Hunt Launch

**Goal:** 200+ upvotes. Top 5 product of the day.

---

### Pre-Launch (Days 8–10)

- [ ] **Task 8.1: Create Product Hunt account and claim maker status**
  - Create account at producthunt.com
  - Fill in bio + link to RepoDoc
  - Follow 50+ active PH users in the dev tools category

- [ ] **Task 8.2: Create Product Hunt assets**
  Required:
  - [ ] Logo: 240x240px PNG (your current logo)
  - [ ] Tagline: max 60 chars → `"AI-powered README that stays in sync with your code"`
  - [ ] Thumbnail: 1270x760px — show the split view editor + drift score
  - [ ] Gallery images (4–6):
    1. Roast tool with a C-grade result
    2. Analysis progress steps
    3. Generated README split view
    4. Drift panel with score
    5. PR creation success state
    6. Docs CI workflow comment on a PR
  - [ ] Demo video: 60–90 seconds. Screen recording. No voiceover needed — just captions.

- [ ] **Task 8.3: Write Product Hunt copy**

  **Tagline:** `AI-powered README that stays in sync with your code`

  **Description (paste this in):**
  ```
  RepoDoc reads your actual codebase — not just your package.json — 
  and generates accurate, specific documentation automatically.

  But generation is the easy part. The real problem is keeping docs 
  accurate as code changes. That's what RepoDoc solves.

  ✅ Roast My README — score any public repo in 5 seconds (no login)
  ✅ Repo Analyzer — reads your real code, not user descriptions
  ✅ Smart README Generator — real function names, real commands, real env vars
  ✅ Auto PR Creation — raises a GitHub PR with updated docs
  ✅ Doc Drift Detection — tells you when your README goes out of sync
  ✅ Docs CI GitHub Action — fails/warns on PRs when docs may be stale

  Built for developers who ship fast and document... eventually.
  ```

- [ ] **Task 8.4: Line up supporters before launch**
  - Tell 20 people personally (friends, Twitter followers, Discord) the exact day you're launching
  - Ask them to: upvote + leave a comment (comments boost ranking more than upvotes)
  - Do NOT ask for upvotes in mass Discord/Twitter posts — PH detects and filters this
  - Ask for genuine comments: "What do you think of the drift detection feature?"

- [ ] **Task 8.5: Prepare your launch-day post template**
  ```
  🚀 Just launched RepoDoc on Product Hunt!

  Your README is probably lying to your users.
  Every time you ship a PR, your docs get a little more wrong.

  RepoDoc fixes that — automatically.

  [link] Would love your feedback 🙏
  ```

---

### Launch Day (Day 11)

- [ ] **Task 9.1: Submit to Product Hunt at 12:01am PST**
  - This gives your product the full 24-hour voting window
  - Submit, then immediately post your launch announcement

- [ ] **Task 9.2: Post everywhere at the same time**
  - Twitter/X: launch post (pin to your profile)
  - LinkedIn: professional version
  - All Discord servers you're in
  - Reddit: r/SideProject (launch posts are welcome here)
  - Dev.to: "I just launched RepoDoc on Product Hunt" — link post

- [ ] **Task 9.3: Respond to every single PH comment within 30 minutes**
  - This is your #1 job for the entire day
  - Be human. Be specific. Don't give generic replies.
  - If someone asks a question → answer fully + ask what they'd want to see

- [ ] **Task 9.4: Track metrics throughout the day**
  - Upvote count (check every hour)
  - Signups from PH (add UTM parameter: `?utm_source=producthunt` to your PH link)
  - Check Supabase: how many new users signed up?
  - Note every piece of feedback — this is your product roadmap

---

### Post-Launch (Days 12–14)

- [ ] **Task 10.1: Write a "launch results" blog post**
  - "We launched on Product Hunt. Here's what happened."
  - Include: upvotes, signups, top feedback, what you're building next
  - Publish on dev.to — this gets significant traffic

- [ ] **Task 10.2: Email every person who signed up during launch week**
  - Personal email, not a newsletter
  - "Hi [name], thanks for trying RepoDoc. How did the README generation work for your project? Anything that didn't work as expected?"
  - Goal: 10 real conversations with real users

- [ ] **Task 10.3: Analyze sign-up → active use funnel**
  - How many people signed up?
  - How many connected a GitHub repo?
  - How many ran an analysis?
  - How many generated a README?
  - How many created a PR?
  - The biggest drop-off point = your #1 product problem to fix

---

## 📅 WEEK 3: OSS Maintainer Outreach

**Goal:** 10 real power users who give detailed feedback and potentially become advocates.

---

### Day 15–16: Find Your Targets

- [ ] **Task 11.1: Build a target list of 50 OSS maintainers**
  Use this criteria to find them:
  - Repos with 50–5,000 stars (big enough to care about docs, small enough to respond to email)
  - Last commit within 30 days (active maintainer)
  - README scores C or below when you run your Roast tool on them
  - Maintainer has email visible in GitHub profile or commits

  Sources:
  - GitHub Trending (weekly, filter by language)
  - `awesome-*` lists on GitHub
  - Your own Roast tool results from Day 6

  Create a spreadsheet:
  | Repo | Stars | README Score | Maintainer | Email | Status |
  |---|---|---|---|---|---|
  | owner/repo | 1200 | C+ | @username | email | Not contacted |

  **Verify:** Spreadsheet has 50 rows with emails for at least 30 of them

- [ ] **Task 11.2: Run RepoDoc on all 50 repos**
  - Use your Roast tool + full analysis for each
  - Note the 2–3 most specific issues for each repo
  - This makes your outreach personal and non-generic
  **Verify:** Each row in spreadsheet has specific issues filled in

---

### Day 17–19: Send Outreach Emails

- [ ] **Task 12.1: Write your outreach template**
  The template below works. Do NOT change the structure. Change only the specific details per repo.

  **Subject:** Found something about {repo_name}'s README

  **Body:**
  ```
  Hi {name},

  I ran {repo_name} through RepoDoc, an AI tool I built that scores 
  README quality. Your score: {grade} ({score}/100).

  Biggest issues found:
  - {specific_issue_1}
  - {specific_issue_2}

  You can see the full breakdown here: repodoc.vercel.app/?roast={repo_url}

  I'm building RepoDoc as a real SaaS and would love 10 minutes of 
  feedback from someone who maintains a real OSS project. No pitch, 
  just questions.

  Worth a call?

  {your name}
  ```

  Rules:
  - Max 100 words
  - One specific data point about their repo (the score)
  - One question at the end (not multiple)
  - No "I hope this email finds you well"
  - No links except the one relevant link

- [ ] **Task 12.2: Send 10 emails on Day 17**
  - Do not send all 50 at once
  - Start with 10 to test the template
  - Use your personal email, not a tool email (higher deliverability, more human)
  **Verify:** 10 emails sent, logged in spreadsheet

- [ ] **Task 12.3: Send next 20 emails on Day 18**
  - Adjust template based on any early replies from Day 17 batch
  **Verify:** 30 total sent

- [ ] **Task 12.4: Send final 20 emails on Day 19**
  **Verify:** 50 total sent

- [ ] **Task 12.5: Follow up once on Day 21**
  For anyone who hasn't replied:
  ```
  Subject: Re: Found something about {repo_name}'s README

  Just bumping this up — happy to share the full analysis either way.

  {your name}
  ```
  One follow-up. No more. Respect people's time.

---

### Day 20–21: Run the Feedback Calls

- [ ] **Task 13.1: Conduct feedback calls (aim for 10)**
  For each call — ask exactly these 5 questions, in this order:

  1. "Walk me through what happens when you need to update your README today. What's the process?"
  2. "What was the first thing you noticed when you saw your RepoDoc score?"
  3. "Which feature would make you actually open this tool more than once a month?"
  4. "Would you pay $9/month for this? Why or why not?"
  5. "Who else on your team would use this besides you?"

  **Do not pitch during the call. Only listen and ask follow-up questions.**

- [ ] **Task 13.2: Log every answer in a single document**
  After 10 calls, look for patterns:
  - What pain keeps coming up that you didn't expect?
  - Which feature got the most excitement?
  - What did multiple people say wouldn't make them pay?
  - What surprised you?

- [ ] **Task 13.3: Write a "what we learned" internal doc**
  This becomes the input for your next sprint.
  One paragraph per question, summarizing what you heard.
  Pin this to the top of your project notes.
  This is more valuable than any PRD you can write before talking to users.

---

## 📊 Success Metrics by End of Week 3

| Metric | Target | How to measure |
|---|---|---|
| GitHub App installs | 20+ | Supabase `installations` table count |
| Docs CI Action stars | 10+ | `repodoc/docs-check` repo stars |
| Product Hunt upvotes | 200+ | Product Hunt dashboard |
| New signups (all sources) | 100+ | Supabase `users` table count |
| Active users (ran analysis) | 30+ | Supabase `analyses` table distinct user count |
| User feedback calls | 10 | Your spreadsheet |
| Blog post views | 1,000+ | dev.to analytics |
| Paying users | 3+ | Your payment system (add Stripe in Week 4 if not yet built) |

---

## 🔑 The One Rule For All Three Weeks

**Talk to users every single day.**

Not about your product. About their problem. The best product decisions come from listening to what people are trying to do, not from building what you think they want.

Every day you write code without talking to a user is a day you might be building the wrong thing.

---

*Task List Version 1.0 — RepoDoc Growth Plan*
*Timeline: 3 weeks | Goal: Real users, real feedback, real retention*