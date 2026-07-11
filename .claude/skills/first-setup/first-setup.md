---
name: first-setup
description: Step-by-step guide to set up the project from scratch for the first time. Use when the user asks how to set up the project, run it for the first time, clone and run, or onboard a new dev.
---

# First Setup

Follow these steps in order. Each step must succeed before moving to the next.

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL running locally (default: `localhost:5432`)

---

## 1. Install dependencies

```bash
npm install
```

> **No GitHub token needed here.** The shared `@tpklabs/browchar-contracts`
> package lives in `packages/` as an npm **workspace**, so `npm install`
> resolves it locally (symlink) without hitting the registry. A token is only
> needed to _publish_ the package (see below) or to consume it from
> `browchar-fe`.

---

## 2. Create the `.env` file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then open `.env` and set:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"
```

The default values in `.env.example` assume a local PostgreSQL instance with:

- user: `nest_user`
- password: `nest_password`
- database: `rpg_sheets_db`

Create that database and user in PostgreSQL if they don't exist yet.

---

## 3. Run database migrations

```bash
npx prisma migrate deploy
```

This applies all existing migrations in `prisma/migrations/` to the database.

---

## 4. Generate Prisma client

```bash
npx prisma generate
```

This generates the TypeScript client in `prisma/generated/`.

---

## 5. Seed the database

```bash
npx tsx prisma/seed.ts
```

Populates the database with initial data: systems, games, and playbooks.

---

## 6. Start the dev server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000` (or the `PORT` set in `.env`).

---

## Verify everything works

Run the test suite to confirm the setup is correct:

```bash
npm test
```

---

## Shared contracts package & GitHub Packages auth

Types/validation shared with `browchar-fe` live in `packages/contracts`
(`@tpklabs/browchar-contracts`), published to **GitHub Packages** under the
`TPKLabs` org. The `.npmrc` in the repo root maps the `@tpklabs` scope to the
registry and reads the token from `${GITHUB_TOKEN}` — **the token itself is
never committed**, only the env-var reference.

**Who needs a token:**

| You are…                                                       | Token?                                          | Scope            |
| -------------------------------------------------------------- | ----------------------------------------------- | ---------------- |
| A dev cloning **browchar-api** to run/develop it               | **No** — workspace resolves the package locally | —                |
| Publishing a new version of the package                        | **Yes**                                         | `write:packages` |
| A dev cloning **browchar-fe** (consumes the published package) | **Yes**                                         | `read:packages`  |

**Setting the token** (only if you need one, per the table):

1. Create a Personal Access Token (classic) at
   GitHub → Settings → Developer settings → Tokens (classic), with the scope
   from the table. Repos are public, so `repo` is not required.
2. Put it in your environment (never in a committed file):
   - Windows: `setx GITHUB_TOKEN "ghp_…"` (persists; open a new shell after).
   - macOS/Linux: add `export GITHUB_TOKEN=…` to your `~/.bashrc` / `~/.zshrc`.

**Shortcut with the GitHub CLI** (if you already use `gh`): reuse its session
instead of managing a separate PAT:

```bash
gh auth refresh -s read:packages      # add write:packages instead, to publish
export GITHUB_TOKEN=$(gh auth token)  # add to your shell profile
```

**Publishing** (manual until CI exists):

```bash
cd packages/contracts
npm version patch     # 0.1.0 -> 0.1.1
npm publish           # runs the build via prepublishOnly, then uploads
```

> **Future:** once CI (GitHub Actions) is set up, publishing should move to a
> workflow using the built-in `secrets.GITHUB_TOKEN`, which has packages
> permissions automatically — no personal tokens to create or rotate. The
> manual PAT flow above is the bridge until then.

See `packages/contracts/README.md` for the full publish/consume reference, and
`docs/security/github-packages-token.md` for the token's security
considerations (minimal scope, expiration, leak response) and the CI checklist.

---

## Pre-commit hooks

After `npm install`, husky sets up Git hooks automatically. On every commit:

1. **lint-staged** runs ESLint (`--fix`) and Prettier (`--write`) on staged `.ts` files — **this modifies your files in place** before the commit goes through. Review the diff after a failed commit if files changed unexpectedly.
2. **Contracts version check** — changes to `packages/contracts` published source must bump the package version in the same commit (see the `pre-commit` skill)
3. TypeScript type-check (`tsc --noEmit`)
4. Prisma schema validation
5. Unit tests

> In CI environments (`CI=true`), husky is skipped automatically — hooks only run locally.

---

## Troubleshooting

| Problem                                   | Fix                                                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` connection error           | Check PostgreSQL is running and credentials in `.env` match                                                       |
| `prisma generate` fails                   | Make sure `npm install` ran successfully first                                                                    |
| Seed fails with "System not found"        | Run migrations before seeding (`prisma migrate deploy` first)                                                     |
| Port already in use                       | Change `PORT` in `.env` or kill the process on that port                                                          |
| `npm publish`/consume: `401 Unauthorized` | `GITHUB_TOKEN` not set or lacks the right scope (`write:packages` to publish, `read:packages` to consume)         |
| `npm publish`: `403`/SSO error            | If the `TPKLabs` org enforces SSO, authorize the token for the org (the "Configure SSO" button next to the token) |
