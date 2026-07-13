import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../src/routes/Login';

const signInEmail = vi.fn();

vi.mock('../src/lib/auth-client', () => ({
  signIn: { email: (...args: unknown[]) => signInEmail(...args) },
  signUp: { email: vi.fn() },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

async function fillAndSubmit(email: string, password: string) {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText(/email/i), email);
  await u.type(screen.getByLabelText(/password/i), password);
  await u.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the server error when credentials are rejected', async () => {
    signInEmail.mockResolvedValue({ error: { status: 401, message: 'Invalid email or password' } });

    renderLogin();
    await fillAndSubmit('ada@example.com', 'correct-horse-battery');

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });

  it('shows a human message on 429 instead of white-screening', async () => {
    signInEmail.mockResolvedValue({ error: { status: 429, message: 'Too many requests' } });

    renderLogin();
    await fillAndSubmit('ada@example.com', 'correct-horse-battery');

    // Rate limiting is ON in dev here, so 429 is a state a real user WILL hit.
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i);
  });

  it('rejects a short password client-side, without calling the API', async () => {
    renderLogin();
    await fillAndSubmit('ada@example.com', 'short');

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 12 characters/i);
    expect(signInEmail).not.toHaveBeenCalled();
  });
});
