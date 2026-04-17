import * as core from '@actions/core';
import * as github from '@actions/github';

interface DriftReport {
  drift_score: number;
  status: 'in-sync' | 'minor-drift' | 'moderate-drift' | 'major-drift';
  summary: string;
  changed_items?: Array<{
    readme_impact: string;
    change: string;
  }>;
}

const REPODOC_BASE_URL = 'https://repodoc.vercel.app';

async function run(): Promise<void> {
  try {
    // ── Inputs ─────────────────────────────────────────────────
    const repoToken = core.getInput('repo-token', { required: true });
    const apiKey = core.getInput('repodoc-api-key', { required: true });
    const failOnDrift = core.getInput('fail-on-drift') === 'true';
    const threshold = parseInt(core.getInput('drift-threshold') || '70', 10);
    const postComment = core.getInput('post-comment') !== 'false';

    const { owner, repo } = github.context.repo;
    const octokit = github.getOctokit(repoToken);

    core.info(`🔍 RepoDoc: Checking documentation for ${owner}/${repo}`);
    core.info(`   Drift threshold: ${threshold} | Fail on drift: ${failOnDrift}`);

    // ── Call RepoDoc API ────────────────────────────────────────
    const response = await fetch(`${REPODOC_BASE_URL}/api/ci/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ owner, repo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      core.warning(`RepoDoc API returned ${response.status}: ${errorText}`);
      core.warning('Skipping drift check — RepoDoc may not have analyzed this repo yet.');
      core.setOutput('drift-score', '0');
      core.setOutput('status', 'unknown');
      core.setOutput('summary', 'No analysis available');
      return;
    }

    const result: DriftReport = await response.json();

    core.info(`📊 Drift Score: ${result.drift_score}/100`);
    core.info(`   Status: ${result.status.replace(/-/g, ' ')}`);
    core.info(`   Summary: ${result.summary}`);

    // ── Set outputs ─────────────────────────────────────────────
    core.setOutput('drift-score', String(result.drift_score));
    core.setOutput('status', result.status);
    core.setOutput('summary', result.summary);

    // ── Post PR comment ─────────────────────────────────────────
    const isPR = github.context.eventName === 'pull_request';
    const prNumber = github.context.payload.pull_request?.number;

    if (isPR && prNumber && postComment && result.drift_score < threshold) {
      try {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: buildComment(result, threshold),
        });
        core.info(`💬 Posted documentation drift comment on PR #${prNumber}`);
      } catch (commentErr) {
        core.warning(`Failed to post PR comment: ${commentErr}`);
      }
    }

    // ── Determine success/failure ────────────────────────────────
    if (result.drift_score < threshold) {
      const message = `Documentation drift detected. Score: ${result.drift_score}/100 (threshold: ${threshold})`;
      if (failOnDrift) {
        core.setFailed(message);
      } else {
        core.warning(`⚠️ ${message}`);
        core.warning('Set fail-on-drift: "true" to turn this into a CI failure.');
      }
    } else {
      core.info(`✅ Documentation is in sync. Score: ${result.drift_score}/100`);
    }
  } catch (error) {
    core.setFailed(`RepoDoc action failed: ${error}`);
  }
}

function buildComment(result: DriftReport, threshold: number): string {
  const emoji = result.drift_score >= 80 ? '✅' : result.drift_score >= 60 ? '⚠️' : '🔴';
  const statusLabel = result.status.replace(/-/g, ' ');

  const changedItems =
    result.changed_items && result.changed_items.length > 0
      ? `\n### 📝 What may need updating:\n${result.changed_items
          .map((i) => `- **${i.readme_impact}**: ${i.change}`)
          .join('\n')}`
      : '';

  return `## ${emoji} RepoDoc: Documentation Health Check

**Drift Score: ${result.drift_score}/100** — *${statusLabel}* (min: ${threshold})

${result.summary}
${changedItems}

[→ Review and update documentation on RepoDoc](${REPODOC_BASE_URL})

---
*[RepoDoc](${REPODOC_BASE_URL}) — Self-healing documentation for GitHub repos*`;
}

run();
