import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        // API tests hit a REAL Postgres (auth_app_test). Mocking the database
        // would mock away the exact things worth asserting — that the password is
        // actually hashed on disk, that constraints hold, that the adapter works.
        test: {
          name: 'api',
          root: './apps/api',
          environment: 'node',
          globals: true,
          include: ['tests/**/*.test.ts'],
          setupFiles: ['./tests/setup.ts'],
          // One database, shared by every test file: parallel workers would
          // truncate each other's rows mid-test. This is the classic "passes
          // alone, fails in CI" bug. Serialize.
          fileParallelism: false,
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          hookTimeout: 30_000,
          testTimeout: 30_000,
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'web',
          root: './apps/web',
          environment: 'jsdom',
          globals: true,
          include: ['tests/**/*.test.tsx'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.ts'],
      exclude: [
        'apps/api/src/db/schema.ts', // generated
        'apps/web/src/main.tsx',
        '**/*.d.ts',
      ],
      // A threshold makes coverage a gate. Without one it's a dashboard nobody opens.
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
