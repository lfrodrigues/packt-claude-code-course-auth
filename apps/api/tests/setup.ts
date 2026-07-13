import { beforeAll, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';

// Must be set BEFORE env.ts is imported anywhere, so that env.DATABASE_URL
// resolves to TEST_DATABASE_URL rather than the database you dev against.
process.env['NODE_ENV'] = 'test';

const { db, pool } = await import('../src/db/index.js');

beforeAll(async () => {
  // Fail loudly rather than silently wiping the dev database.
  const { rows } = await pool.query<{ current_database: string }>('select current_database()');
  const name = rows[0]?.current_database;

  if (!name?.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against "${name}" — the test database name must end in _test. ` +
        `Check TEST_DATABASE_URL in your .env.`
    );
  }
});

beforeEach(async () => {
  // Every test starts from empty, so test ORDER can never matter. Truncating is
  // far faster than re-running migrations, and CASCADE handles the FKs for us.
  //
  // `rate_limit` MUST be in this list. Better Auth keys its limiter by IP, not by
  // email — so without resetting the counter, the 5-per-minute sign-in limit is
  // shared across the whole suite and unrelated tests start 429ing each other.
  await db.execute(
    sql`TRUNCATE TABLE "session", "account", "verification", "rate_limit", "user" RESTART IDENTITY CASCADE`
  );
});

afterAll(async () => {
  await pool.end();
});
