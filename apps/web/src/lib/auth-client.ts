import { createAuthClient } from 'better-auth/react';

/**
 * Same-origin in dev (Vite proxies /api to the API), so no baseURL is needed —
 * the client defaults to the current origin and the session cookie rides along.
 */
export const authClient = createAuthClient();

// Re-exported individually (not destructured) so declaration emit can name the
// types without reaching into better-auth's internal dist paths.
export const signIn: typeof authClient.signIn = authClient.signIn;
export const signUp: typeof authClient.signUp = authClient.signUp;
export const signOut: typeof authClient.signOut = authClient.signOut;
export const useSession: typeof authClient.useSession = authClient.useSession;
