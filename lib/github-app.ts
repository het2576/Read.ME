// /lib/github-app.ts — GitHub App authentication client
// Used for webhook-triggered operations that don't have a user OAuth token.
// The GitHub App can act on behalf of any installation (repo/org that installed it).

import { createHmac, timingSafeEqual } from 'crypto';

// ──────────────────────────────────────────
// Lazy-loaded App instance (avoids import errors when env vars are missing)
// ──────────────────────────────────────────

let _app: import('@octokit/app').App | null = null;

function getApp() {
  if (_app) return _app;

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;

  if (!appId || !privateKey || !webhookSecret) {
    throw new Error(
      'GitHub App env vars not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_WEBHOOK_SECRET'
    );
  }

  // Dynamic import to avoid issues if the package isn't installed yet
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { App } = require('@octokit/app');

  _app = new App({
    appId,
    privateKey: privateKey.replace(/\\n/g, '\n'), // handle newlines escaped in env
    webhooks: { secret: webhookSecret },
  });

  return _app!;
}

// ──────────────────────────────────────────
// Public API
// ──────────────────────────────────────────

/**
 * Returns an Octokit instance authenticated as a specific GitHub App installation.
 * Use this for all write operations triggered by webhooks (comments, status checks, etc.)
 */
export async function getInstallationOctokit(installationId: number) {
  const app = getApp();
  return app.getInstallationOctokit(installationId);
}

/**
 * Returns the app-level Octokit instance.
 * Use this for listing installations or app-level metadata.
 */
export function getAppOctokit() {
  const app = getApp();
  // The app.octokit property is typed differently across versions — cast it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app as any).octokit;
}

// ──────────────────────────────────────────
// Webhook Signature Verification
// ──────────────────────────────────────────

/**
 * Verifies a GitHub webhook payload signature.
 * GitHub signs every webhook with HMAC-SHA256 using our webhook secret.
 * We MUST verify this before processing any webhook to prevent spoofing.
 *
 * @param payload - Raw request body as string
 * @param signature - The `x-hub-signature-256` header value
 * @param secret - Our webhook secret from env
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload, 'utf8').digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Check if the GitHub App is configured (env vars are present).
 * Use this to conditionally show GitHub App features in the UI.
 */
export function isGitHubAppConfigured(): boolean {
  return !!(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    process.env.GITHUB_APP_WEBHOOK_SECRET
  );
}
