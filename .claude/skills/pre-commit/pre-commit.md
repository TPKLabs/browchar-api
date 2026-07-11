---
name: pre-commit
description: Guide for understanding, running, bypassing, or modifying the pre-commit hook. Use when the user asks about what checks run before a commit, why a commit is failing, how to skip the hook, or how to add/remove a check.
---

# Pre-commit Hook

Every commit triggers a set of automated checks via **husky** + **lint-staged**. If any check fails, the commit is blocked until the issue is fixed.

## What runs on every commit

### 1. Lint + Format (on staged `.ts` files only)

Handled by `lint-staged` — only touches files you're committing, so it's fast.

- **ESLint** (`eslint --fix`) — enforces code quality rules, including:
  - `no-console`: `console.log` and similar calls are **not allowed** in committed code.
  - All TypeScript-ESLint recommended rules.
- **Prettier** (`prettier --write`) — auto-formats code.

### 2. Contracts version bump (`scripts/check-contracts-version.mjs`)

If the commit touches the published surface of `@tpklabs/browchar-contracts`
(`packages/contracts/src/**` excluding specs, or its `tsconfig.json`), the
package version in `packages/contracts/package.json` must be bumped in the
same commit — otherwise the commit is blocked with instructions
(`npm version patch -w @tpklabs/browchar-contracts`). When the bump is
present, the hook prints a reminder to `npm publish` after the change lands.
The publish itself can't be verified locally (needs a `write:packages` token);
it stays manual until CI owns it — see `docs/security/github-packages-token.md`.

> Known limit: amending a commit that already bumped asks for another bump
> (it compares against the amended commit). Bump again or use `--no-verify`
> for that amend.

### 3. Type check (full project)

```
tsc --noEmit
```

Catches TypeScript type errors across the entire codebase, not just staged files.

### 4. Prisma schema validation

```
prisma validate
```

Ensures the Prisma schema is syntactically valid before committing.

### 5. Unit tests

```
jest --passWithNoTests --bail
```

Runs all unit tests. `--bail` stops on the first failure. `--passWithNoTests` allows commits when there are no test files yet.

## If the commit is blocked

Read the error output — it tells you which check failed and why. Fix the issue, stage the changes (`git add`), and commit again.

## If you need to skip the hook (emergencies only)

```bash
git commit --no-verify -m "your message"
```

Only use this for genuine emergencies (e.g. fixing a broken CI config). Never skip to avoid fixing real errors.

## Adding or removing checks

- **lint-staged rules** (which files, which commands): edit `lint-staged.config.mjs`.
- **Hook steps** (contracts version check, type check, prisma, tests): edit `.husky/pre-commit`.
- **Standalone check scripts** (test pairs, contracts version): live in `scripts/check-*.mjs`.
- **ESLint rules** (what's enforced): edit `eslint.config.mjs`.
