import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInSchema, signUpSchema } from '@auth-app/shared';
import { signIn, signUp } from '../lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Validate with the SHARED schema — the same one the server enforces. The
    // browser check is a courtesy; the server's is the one that counts.
    const parsed =
      mode === 'sign-up'
        ? signUpSchema.safeParse({ email, password, name })
        : signInSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }

    setPending(true);

    // Submit the PARSED data, not the raw state — the schema trims and
    // lowercases the email, and sending the raw value would throw that
    // normalization away.
    const result =
      mode === 'sign-up'
        ? await signUp.email(signUpSchema.parse({ email, password, name }))
        : await signIn.email(signInSchema.parse({ email, password }));

    setPending(false);

    if (result.error) {
      // 429 is a real, reachable state here: rate limiting is enabled in dev.
      // A UI that only handles "wrong password" white-screens the moment someone
      // fat-fingers their password six times.
      setError(
        result.error.status === 429
          ? 'Too many attempts. Wait a minute and try again.'
          : (result.error.message ?? 'Something went wrong.')
      );
      return;
    }

    void navigate('/dashboard');
  }

  return (
    <main className="card">
      <h1>{mode === 'sign-in' ? 'Sign in' : 'Create an account'}</h1>

      <form onSubmit={handleSubmit} noValidate>
        {mode === 'sign-up' && (
          <label>
            Name
            <input
              type="text"
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending}>
          {pending ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          setError(null);
        }}
      >
        {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </button>
    </main>
  );
}
