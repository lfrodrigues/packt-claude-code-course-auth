import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';

/**
 * Client-side gating is UX, not security. It stops a signed-out user from seeing
 * an empty dashboard; it does NOT protect data. The server's session check in
 * /api/me is what actually protects anything — anyone can edit the JS in their
 * own browser.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) return <p className="card">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
