#!/usr/bin/env node
/**
 * Pre-commit gate: every newly added source file under src/ must ship with a
 * sibling spec file in the same commit.
 *
 * Invoked by lint-staged with the staged file paths as argv. Filters those
 * down to files git reports as "added" (renames/edits are exempt) and
 * excludes framework/type-only files that have nothing to unit test
 * (modules, DTOs, entities, interfaces, type files, the main bootstrap and
 * barrels).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf8',
}).trim();

const candidates = process.argv
  .slice(2)
  .map((file) => path.relative(repoRoot, file).split(path.sep).join('/'));
if (candidates.length === 0) process.exit(0);

const addedFiles = new Set(
  execSync('git diff --cached --diff-filter=A --name-only', {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean),
);

const EXEMPT_PATTERNS = [
  /\.spec\.ts$/,
  /\.d\.ts$/,
  /\.module\.ts$/,
  /\.dto\.ts$/,
  /\.entity\.ts$/,
  /\.interface\.ts$/,
  /\.types\.ts$/,
  /(^|\/)index\.ts$/,
  /(^|\/)main\.ts$/,
];

function isExempt(file) {
  return EXEMPT_PATTERNS.some((pattern) => pattern.test(file));
}

function hasTestSibling(file) {
  const dir = path.dirname(file);
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  return (
    existsSync(path.join(dir, `${base}.spec${ext}`)) ||
    existsSync(path.join(dir, `${base}.test${ext}`)) ||
    existsSync(path.join(dir, '__tests__', `${base}.spec${ext}`))
  );
}

const missing = candidates.filter(
  (file) =>
    addedFiles.has(file) &&
    /^src\//.test(file) &&
    !isExempt(file) &&
    !hasTestSibling(file),
);

if (missing.length > 0) {
  console.error('\nFalta un spec para estos archivos nuevos:\n');
  for (const file of missing) {
    const ext = path.extname(file);
    console.error(`  ${file} -> ${file.slice(0, -ext.length)}.spec${ext}`);
  }
  console.error(
    '\nAgregá el archivo de spec junto al código, o si es un caso sin lógica ' +
      'propia para testear, marcalo excluido en scripts/check-test-pairs.mjs.\n',
  );
  process.exit(1);
}
