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
JWT_SECRET=<generate one — see below>
JWT_EXPIRES_IN=7d
```

The default values in `.env.example` assume a local PostgreSQL instance with:

- user: `nest_user`
- password: `nest_password`
- database: `rpg_sheets_db`

Create that database and user in PostgreSQL if they don't exist yet.

### `JWT_SECRET` — what it is, and how to set it

**First, the distinction that trips people up.** There are two different things
here and you only create one of them:

|                                  | What it is                                            | Who creates it                        |
| -------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| `JWT_SECRET`                     | The signing key. One value per environment, set once. | **You**, with the command below       |
| The access token (`eyJhbGciOi…`) | Proof that a user logged in. One per login.           | The **server**, on `POST /auth/login` |

The secret is the stamp; the token is the stamped document. Anyone can _read_ a
token — it is signed, not encrypted — but only someone holding the secret can
_forge_ one. That is why the secret is the single point of failure for the whole
auth system: whoever has it can sign `{sub: <any user id>}` and log in as anyone,
without ever knowing a password.

You will never generate a token by hand. You generate the secret, and the app
does the rest.

#### How

```bash
openssl rand -base64 48
```

#### Where

Paste the output into your local `.env`:

```env
JWT_SECRET=<the output of the command above>
```

It must be at least 32 characters — the app validates this and refuses to boot
otherwise. `.env` is gitignored; the real value never goes in the repo.

#### When

**Now — before the first `npm run start:dev`.** This is not optional setup you
can defer: `src/config/env.ts` validates the secret at import time, so a missing
or short value fails at **startup**, not on the first login. If you skip it you
get this and the process exits:

```
[ENV] Falta JWT_SECRET. Generá uno con: openssl rand -base64 48
```

You set it **once per environment**, not per run:

- **Local dev** — once, in `.env`. Keep it as long as you like.
- **CI / e2e** — already handled: `test/e2e/server.ts` injects a throwaway
  secret, so you do not need to configure anything for `npm run test:e2e`.
- **Production (Railway)** — a **different** secret, set as an environment
  variable in the Railway dashboard, never copied from your local `.env`. See
  DEV-165.

Rotating the secret invalidates every token signed with the old one, which logs
every user out. That is the intended way to revoke all sessions at once — there
is no server-side revocation for individual tokens (see DEV-182).

> **Why `.env.example` ships it empty:** an example value long enough to pass
> validation would be worse than nothing — everyone cloning the repo would run
> the same publicly known key, and anyone reading GitHub could forge tokens
> against any deployment that copied it.

### `JWT_EXPIRES_IN` (optional)

How long an issued token stays valid. Defaults to `7d`; accepts `1m` to `90d`
(`15m`, `2h`, `7d`). Values below the floor are rejected at startup because they
produce tokens that expire the instant they are issued.

Since tokens cannot be revoked individually, this duration is the only thing
that ends a session on its own — shorter is safer, longer is more convenient.

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

| Problem                                   | Fix                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `[ENV] Falta JWT_SECRET` on startup       | You copied `.env.example`, which ships it empty on purpose. Run `openssl rand -base64 48` and paste it into `.env` |
| `[ENV] JWT_SECRET debe tener al menos 32` | The value is too short — generate a proper one, do not pad it by hand                                              |
| `DATABASE_URL` connection error           | Check PostgreSQL is running and credentials in `.env` match                                                        |
| `prisma generate` fails                   | Make sure `npm install` ran successfully first                                                                     |
| Seed fails with "System not found"        | Run migrations before seeding (`prisma migrate deploy` first)                                                      |
| Port already in use                       | Change `PORT` in `.env` or kill the process on that port                                                           |
| `npm publish`/consume: `401 Unauthorized` | `GITHUB_TOKEN` not set or lacks the right scope (`write:packages` to publish, `read:packages` to consume)          |
| `npm publish`: `403`/SSO error            | If the `TPKLabs` org enforces SSO, authorize the token for the org (the "Configure SSO" button next to the token)  |
