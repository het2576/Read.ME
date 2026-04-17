'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function InstallCallbackPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action');

    if (!installationId) {
      setError('No installation_id found. Did you come from GitHub?');
      setState('error');
      return;
    }

    if (setupAction === 'request') {
      // User requested the app but it hasn't been approved yet (org scenario)
      setState('success');
      return;
    }

    // Save the installation to DB
    fetch('/api/install/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installation_id: parseInt(installationId) }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to save installation');
        setState('success');
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
        setState('error');
      });
  }, [status, searchParams, router, session]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 520,
        padding: '48px 40px',
        background: 'rgba(22, 27, 34, 0.8)',
        border: '1px solid rgba(48, 54, 61, 0.8)',
        borderRadius: 20,
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px)',
      }}>
        {state === 'loading' && (
          <>
            <div style={{
              width: 72, height: 72, margin: '0 auto 28px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 1.5s infinite',
              fontSize: 32,
            }}>
              ⚙️
            </div>
            <h1 style={{ color: '#f0f6fc', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
              Setting up RepoDoc...
            </h1>
            <p style={{ color: '#8b949e', fontSize: 16, lineHeight: 1.6 }}>
              Connecting your GitHub App installation
            </p>
            <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.8;transform:scale(1.05)} }`}</style>
          </>
        )}

        {state === 'success' && (
          <>
            <div style={{
              width: 80, height: 80, margin: '0 auto 28px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38,
              animation: 'bounce 0.6s ease',
              boxShadow: '0 0 40px rgba(34, 197, 94, 0.3)',
            }}>
              🎉
            </div>
            <h1 style={{ color: '#f0f6fc', fontSize: 30, fontWeight: 800, marginBottom: 12 }}>
              RepoDoc is now active!
            </h1>
            <p style={{ color: '#8b949e', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              Auto-monitoring is enabled. RepoDoc will now detect documentation drift on every push and PR — automatically.
            </p>

            <div style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 32,
              textAlign: 'left',
            }}>
              {[
                '✅ Push monitoring enabled',
                '✅ PR documentation checks active',
                '✅ Drift alerts configured',
              ].map((item) => (
                <div key={item} style={{ color: '#7ee8a2', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="/dashboard"
                style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                Go to Dashboard →
              </a>
              <a
                href="/settings"
                style={{
                  padding: '12px 28px',
                  background: 'rgba(48, 54, 61, 0.6)',
                  color: '#c9d1d9',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  border: '1px solid rgba(48,54,61,0.8)',
                }}
              >
                Settings
              </a>
            </div>
            <style>{`@keyframes bounce { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 80%{transform:scale(0.95)} 100%{transform:scale(1)} }`}</style>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{
              width: 80, height: 80, margin: '0 auto 28px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38,
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.25)',
            }}>
              ⚠️
            </div>
            <h1 style={{ color: '#f0f6fc', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
              Something went wrong
            </h1>
            <p style={{ color: '#8b949e', fontSize: 15, marginBottom: 24 }}>
              {error || 'Could not complete the GitHub App installation.'}
            </p>
            <a
              href="/dashboard"
              style={{
                padding: '12px 28px',
                background: 'rgba(48, 54, 61, 0.8)',
                color: '#c9d1d9',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                border: '1px solid rgba(48,54,61,0.8)',
              }}
            >
              Back to Dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}
