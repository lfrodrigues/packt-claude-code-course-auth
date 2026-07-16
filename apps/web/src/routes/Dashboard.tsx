import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meResponseSchema, type MeResponse } from '@auth-app/shared';
import { signOut, useSession } from '../lib/auth-client';
import { DemoForm } from '../components/DemoForm';

export function Dashboard() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meError, setMeError] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  // Calls the one hand-written protected endpoint, to show it working from the
  // browser as well as from curl. A failure renders as an error, not as a
  // spinner that never resolves.
  useEffect(() => {
    void fetch('/api/me', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/me → ${r.status}`);
        return r.json();
      })
      .then((json) => setMe(meResponseSchema.parse(json)))
      .catch(() => setMeError(true));
  }, []);

  return (
    <main className="card">
      <h1>Signed in</h1>

      <p>
        Session says: <strong>{session?.user.email ?? '…'}</strong>
      </p>
      <p>
        <code>GET /api/me</code> says:{' '}
        <strong>{meError ? 'request failed' : me ? `${me.name} <${me.email}>` : '…'}</strong>
      </p>

      {meError && (
        <p className="error" role="alert">
          Could not load <code>/api/me</code>. Try reloading the page.
        </p>
      )}

      <DemoForm />

      {signOutError && (
        <p className="error" role="alert">
          Sign-out failed. You may still be signed in — try again.
        </p>
      )}

      <button
        type="button"
        onClick={async () => {
          // Only leave the page if the session was actually revoked — navigating
          // on failure makes a still-live session look signed out.
          setSignOutError(false);
          const result = await signOut();
          if (result.error) {
            setSignOutError(true);
            return;
          }
          void navigate('/login');
        }}
      >
        Sign out
      </button>
    </main>
  );
}
