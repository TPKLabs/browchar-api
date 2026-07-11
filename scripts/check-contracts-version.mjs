#!/usr/bin/env node
/**
 * Pre-commit gate: any change to the published surface of
 * `@tpklabs/browchar-contracts` (packages/contracts) must ship a version bump
 * of the package in the same commit.
 *
 * The published artifact is built from `src/**` (specs excluded — see the
 * package tsconfig) plus the build config, so the check triggers on staged
 * changes to those files and then compares the staged `package.json` version
 * against HEAD's. Publishing itself can't be verified here (it needs network
 * + a write:packages token that browchar-api devs don't have — see
 * docs/security/github-packages-token.md), so the hook enforces the bump and
 * prints the publish reminder; the actual `npm publish` stays a manual step
 * until CI takes it over.
 *
 * Known limit: `git commit --amend` on a commit that already bumped compares
 * against the amended commit itself, so it asks for another bump. Bump again
 * or use --no-verify for that amend.
 */
import { execSync } from 'node:child_process';

const PKG_DIR = 'packages/contracts';
const PKG_JSON = `${PKG_DIR}/package.json`;
const PKG_NAME = '@tpklabs/browchar-contracts';

const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

// Files that shape what `npm publish` ships: buildable source (not specs)
// and the compiler/package config.
const publishSurface = staged.filter(
  (file) =>
    (file.startsWith(`${PKG_DIR}/src/`) &&
      file.endsWith('.ts') &&
      !file.endsWith('.spec.ts')) ||
    file === `${PKG_DIR}/tsconfig.json`,
);

if (publishSurface.length === 0) process.exit(0);

function readVersion(gitRef) {
  try {
    const raw = execSync(`git show ${gitRef}:${PKG_JSON}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(raw).version ?? null;
  } catch {
    return null; // file doesn't exist at that ref
  }
}

const headVersion = readVersion('HEAD');
if (headVersion === null) process.exit(0); // first commit of the package

const stagedVersion = readVersion(''); // ':<path>' = staged index content

if (stagedVersion !== null && stagedVersion !== headVersion) {
  console.log(
    `[contracts-version] ${PKG_NAME} ${headVersion} -> ${stagedVersion} — ` +
      `remember to publish after this lands: cd ${PKG_DIR} && npm publish`,
  );
  process.exit(0);
}

console.error(
  `\n[contracts-version] Staged changes touch the published surface of ${PKG_NAME}:\n` +
    publishSurface.map((f) => `  - ${f}`).join('\n') +
    `\n\nbut ${PKG_JSON} still has version ${headVersion}. Bump it in the same commit:\n\n` +
    `  npm version patch -w ${PKG_NAME}   # or minor/major per the change\n` +
    `  git add ${PKG_JSON}\n\n` +
    `Consumers (browchar-fe) pin published versions — shipping changed types\n` +
    `under an already-published version would leave the registry stale or\n` +
    `inconsistent. After the commit lands, publish: cd ${PKG_DIR} && npm publish\n`,
);
process.exit(1);
