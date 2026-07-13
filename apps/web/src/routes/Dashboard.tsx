import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meResponseSchema, type MeResponse } from '@auth-app/shared';
import { signOut, useSession } from '../lib/auth-client';

export function Dashboard() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);

  // Calls the one hand-written protected endpoint, to show it working from the
  // browser as well as from curl.
  useEffect(() => {
    void fetch('/api/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setMe(json ? meResponseSchema.parse(json) : null))
      .catch(() => setMe(null));
  }, []);

  return (
    <main className="card">
      <h1>Signed in</h1>

      <p>
        Session says: <strong>{session?.user.email ?? '…'}</strong>
      </p>
      <p>
        <code>GET /api/me</code> says: <strong>{me ? `${me.name} <${me.email}>` : '…'}</strong>
      </p>

      <button
        type="button"
        onClick={async () => {
          await signOut();
          void navigate('/login');
        }}
      >
        Sign out
      </button>
    </main>
  );
}
