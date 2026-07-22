#!/usr/bin/env node
/**
 * Fails when one package is declared at two different versions across the
 * workspaces.
 *
 * Why this is a gate and not a note: `zod` is the contract. `packages/shared`
 * builds the schemas, `apps/api` and `apps/web` parse with them. If the shared
 * package moves to zod 4 and the API stays on 3, npm installs both, and a schema
 * constructed by one copy is not recognised by the other — the failure surfaces
 * as a runtime parse error or a silently skipped validation, not as a type
 * error. Nothing else in `verify` would notice.
 *
 * Zero dependencies on purpose: this runs in the fast gate.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const rootPkg = read(join(repoRoot, 'package.json'));

/** Expand the `workspaces` globs — only the `dir/*` form this repo uses. */
function workspaceDirs() {
  const dirs = ['.'];
  for (const pattern of rootPkg.workspaces ?? []) {
    if (!pattern.endsWith('/*')) {
      throw new Error(`Unsupported workspace pattern: ${pattern}`);
    }
    const parent = pattern.slice(0, -2);
    for (const entry of readdirSync(join(repoRoot, parent))) {
      if (existsSync(join(repoRoot, parent, entry, 'package.json'))) {
        dirs.push(`${parent}/${entry}`);
      }
    }
  }
  return dirs;
}

// name -> range -> [workspace, ...]
const declared = new Map();

for (const dir of workspaceDirs()) {
  const pkg = read(join(repoRoot, dir, 'package.json'));
  for (const field of ['dependencies', 'devDependencies']) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      // Workspace links carry no meaningful version.
      if (range === '*' || range.startsWith('workspace:')) continue;
      const byRange = declared.get(name) ?? new Map();
      byRange.set(range, [...(byRange.get(range) ?? []), dir]);
      declared.set(name, byRange);
    }
  }
}

const conflicts = [...declared].filter(([, byRange]) => byRange.size > 1);

if (conflicts.length === 0) {
  console.log(`✔ dependency versions consistent across ${workspaceDirs().length} workspaces`);
  process.exit(0);
}

console.error('✖ Same package declared at different versions:\n');
for (const [name, byRange] of conflicts) {
  console.error(`  ${name}`);
  for (const [range, dirs] of byRange) {
    console.error(`    ${range.padEnd(12)} ${dirs.join(', ')}`);
  }
  console.error('');
}
console.error('Bump every workspace together, or the tree ends up with both copies installed.');
process.exit(1);
