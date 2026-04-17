'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ApiKeyData {
  api_key: string;
  just_generated?: boolean;
  regenerated?: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [apiKey, setApiKey] = useState<string>('');
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Workflow YAML snippet
  const workflowYaml = `name: Docs Check
on:
  push:
    branches: [main]
  pull_request:

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: repodoc/docs-check@v1
        with:
          repo-token: \${{ secrets.GITHUB_TOKEN }}
          repodoc-api-key: \${{ secrets.REPODOC_API_KEY }}`;

  const loadApiKey = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/apikey');
      if (res.ok) {
        const data: ApiKeyData = await res.json();
        setApiKey(data.api_key);
      }
    } catch (err) {
      console.error('Failed to load API key:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      loadApiKey();
    }
  }, [status, router, loadApiKey]);

  const handleRegenerate = async () => {
    if (!confirm('Regenerate API key? This will invalidate your current key and break any CI workflows using the old key.')) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/settings/apikey', { method: 'POST' });
      if (res.ok) {
        const data: ApiKeyData = await res.json();
        setApiKey(data.api_key);
        setRevealed(true);
      }
    } catch (err) {
      console.error('Failed to regenerate:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 7)}${'•'.repeat(24)}${apiKey.slice(-4)}`
    : '';

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8b949e', fontSize: 16 }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <a href="/dashboard" style={{
              color: '#7c3aed', fontSize: 14, textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4
            }}>
              ← Dashboard
            </a>
          </div>
          <h1 style={{ color: '#f0f6fc', fontSize: 32, fontWeight: 800, margin: 0 }}>
            Settings
          </h1>
          <p style={{ color: '#8b949e', fontSize: 16, marginTop: 8 }}>
            Manage your RepoDoc API key and GitHub App integration.
          </p>
        </div>

        {/* API Key Card */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: 16,
          padding: '32px',
          marginBottom: 24,
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ color: '#f0f6fc', fontSize: 20, fontWeight: 700, margin: 0 }}>
                🔑 API Key
              </h2>
              <p style={{ color: '#8b949e', fontSize: 14, marginTop: 4 }}>
                Use this to authenticate the RepoDoc GitHub Action in CI.
              </p>
            </div>
            <div style={{
              padding: '4px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 20,
              color: '#22c55e',
              fontSize: 12,
              fontWeight: 600,
            }}>
              ACTIVE
            </div>
          </div>

          {/* Key Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#010409',
            border: '1px solid rgba(48, 54, 61, 0.8)',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 16,
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          }}>
            <span style={{
              color: '#7ee8a2',
              fontSize: 15,
              flex: 1,
              letterSpacing: revealed ? 0 : 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {revealed ? apiKey : maskedKey}
            </span>
            <button
              onClick={() => setRevealed(!revealed)}
              style={{
                background: 'none',
                border: '1px solid rgba(48,54,61,0.8)',
                borderRadius: 6,
                color: '#8b949e',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              {revealed ? '🙈 Hide' : '👁 Reveal'}
            </button>
            <button
              onClick={() => handleCopy(apiKey)}
              style={{
                background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(124,58,237,0.1)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(124,58,237,0.3)'}`,
                borderRadius: 6,
                color: copied ? '#22c55e' : '#a78bfa',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ color: '#8b949e', fontSize: 13, margin: 0, flex: 1 }}>
              ⚠️ Store this securely. Add it to GitHub repo secrets as{' '}
              <code style={{ color: '#f0f6fc', background: 'rgba(48,54,61,0.5)', padding: '1px 6px', borderRadius: 4 }}>
                REPODOC_API_KEY
              </code>
            </p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                color: '#f87171',
                cursor: regenerating ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                opacity: regenerating ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {regenerating ? '⟳ Regenerating...' : '↺ Regenerate'}
            </button>
          </div>
        </div>

        {/* GitHub App Card */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: 16,
          padding: '32px',
          marginBottom: 24,
          backdropFilter: 'blur(20px)',
        }}>
          <h2 style={{ color: '#f0f6fc', fontSize: 20, fontWeight: 700, margin: '0 0 8px 0' }}>
            🤖 GitHub App
          </h2>
          <p style={{ color: '#8b949e', fontSize: 14, marginBottom: 24 }}>
            Install the GitHub App to enable automatic push monitoring and PR checks — no manual triggers needed.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { icon: '🔄', title: 'Auto Push Monitoring', desc: 'Triggers drift checks automatically on every relevant push' },
              { icon: '💬', title: 'PR Bot Comments', desc: 'Posts documentation warnings on relevant pull requests' },
              { icon: '🔔', title: 'Drift Alerts', desc: 'Notifies you in the dashboard when docs go stale' },
            ].map((feature) => (
              <div key={feature.title} style={{
                background: 'rgba(124, 58, 237, 0.05)',
                border: '1px solid rgba(124, 58, 237, 0.15)',
                borderRadius: 10,
                padding: '16px',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{feature.icon}</div>
                <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{feature.title}</div>
                <div style={{ color: '#8b949e', fontSize: 12 }}>{feature.desc}</div>
              </div>
            ))}
          </div>

          <a
            href="https://github.com/apps/repodoc/installations/new"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.25)',
            }}
          >
            Install GitHub App →
          </a>
        </div>

        {/* Docs CI Card */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: 16,
          padding: '32px',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ color: '#f0f6fc', fontSize: 20, fontWeight: 700, margin: 0 }}>
                ⚡ Docs CI GitHub Action
              </h2>
              <p style={{ color: '#8b949e', fontSize: 14, marginTop: 4 }}>
                Add this to your repo to get documentation drift checks on every PR.
              </p>
            </div>
            <button
              onClick={() => handleCopy(workflowYaml)}
              style={{
                padding: '8px 16px',
                background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(124,58,237,0.1)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(124,58,237,0.3)'}`,
                borderRadius: 8,
                color: copied ? '#22c55e' : '#a78bfa',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy YAML'}
            </button>
          </div>

          {/* YAML snippet */}
          <div style={{
            background: '#010409',
            border: '1px solid rgba(48, 54, 61, 0.8)',
            borderRadius: 10,
            padding: '20px',
            marginBottom: 16,
          }}>
            <pre style={{
              margin: 0,
              color: '#e2e8f0',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
              overflow: 'auto',
              tabSize: 2,
            }}>
              <code>{workflowYaml}</code>
            </pre>
          </div>

          <p style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>
            Save this as{' '}
            <code style={{ color: '#f0f6fc', background: 'rgba(48,54,61,0.5)', padding: '1px 6px', borderRadius: 4 }}>
              .github/workflows/docs-check.yml
            </code>{' '}
            in your repo. Add <code style={{ color: '#f0f6fc', background: 'rgba(48,54,61,0.5)', padding: '1px 6px', borderRadius: 4 }}>REPODOC_API_KEY</code> to GitHub repo secrets using the key above.
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
          <p>
            RepoDoc Settings · Signed in as{' '}
            <span style={{ color: '#8b949e' }}>{session?.user?.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
