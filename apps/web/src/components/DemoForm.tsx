import { useState, type FormEvent } from 'react';
import { demoFormSchema, demoResponseSchema, type DemoResponse } from '@auth-app/shared';

/**
 * The second worked example of the shared contract — this one against a
 * hand-written Express route (POST /api/demo) instead of a Better Auth
 * endpoint. Same shape as the login form: validate with the shared schema,
 * submit the PARSED data, and let the server run the identical parse.
 */
export function DemoForm() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResponse | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    // `amount` is a STRING here — every form input is. The schema's
    // z.coerce.number() is what turns "42" into 42, on both sides.
    const parsed = demoFormSchema.safeParse({ email, amount });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }

    setPending(true);

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const message =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : `Request failed (${res.status}).`;
        setError(message);
        return;
      }

      setResult(demoResponseSchema.parse(await res.json()));
    } catch {
      setError('Request failed. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Contract demo</h2>
      <p>
        <code>POST /api/demo</code> validates with the same shared schema this form does.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label>
          Email
          <input
            type="email"
            value={email}
            autoComplete="off"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          Amount (1–1000)
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {result && (
          <p role="status">
            Server understood: <strong>{result.email}</strong> · <strong>{result.amount}</strong> (
            {typeof result.amount})
          </p>
        )}

        <button type="submit" disabled={pending}>
          {pending ? 'Working…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
