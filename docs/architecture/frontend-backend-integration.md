# Frontend/Backend Repo Architecture

Status: Draft
Scope: Repo topology and the FE↔API integration seam
Last updated: 2026-07-11

---

## Context

`browchar-fe` (Next.js) and `browchar-api` (NestJS + Prisma + Postgres) are separate, independently versioned Git repos with their own CI-ish tooling (husky, commitlint, lint-staged, changelog automation) and mirrored convention skills (commit-conventions, pr-conventions, review-standards).

Today the only thing connecting them is:

- FE reads `NEXT_PUBLIC_API_URL` and calls the API with plain `fetch` + TanStack Query.
- FE hand-maintains its own domain types in `src/lib/types`, independent of the API's Prisma-generated / Zod-validated shapes.
- The API has no CORS configuration yet.
- Neither repo has a deploy pipeline yet.

## Decision: keep polyrepo

|                                        | Polyrepo (current)                                        | Monorepo                                       |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| Independent deploy/release cadence     | Yes                                                       | Needs extra tooling (Turborepo/Nx) to preserve |
| CI/tooling simplicity per repo         | Simple, but duplicated (3 skills mirrored verbatim today) | Single source, no duplication                  |
| Type/contract sharing                  | Manual, drift risk                                        | Trivial (same `node_modules` graph)            |
| Fit for current team size (solo/small) | Good                                                      | Overhead not yet justified                     |

Recommendation: **stay polyrepo**. At solo/small-team MVP scale, with only two feature modules (`characters`, `playbooks`), the coordination cost of a monorepo isn't paid back yet. Revisit if: the team grows, tooling duplication causes repeated drift/bugs, or releases need to be coupled.

The rest of this doc is the part that actually needs a decision: the integration seam.

## Integration architecture

### 1. Contract / type sharing — RESOLVED (DEV-153, 2026-07-11)

Current state: FE types are hand-written and can silently drift from what the API actually returns.

Options considered:

1. **Status quo** — manual sync, disciplined by `docs/api/rest-conventions.md` as source of truth.
2. **Generated client** — `@nestjs/swagger` on the API + `openapi-typescript`/`orval` on the FE to codegen types from a live OpenAPI spec.
3. **Shared `@tpklabs/browchar-contracts` package** — Zod schemas published as a versioned private package, consumed by both repos. Both sides already speak Zod (`nestjs-zod` on API, `zod` + `react-hook-form` on FE), so this is the lowest-friction option _if and when_ it's needed.

This doc originally recommended deferring to (1) until either a third API consumer showed up or "type drift causes a real bug (not just a lint annoyance)". **That trigger has now fired.** Building the Characters form (DEV-50) surfaced two concrete drift bugs on day one, documented in `browchar-fe/src/lib/characters/character-schema.ts` (commit `06dd3af`):

- FE applies `.min(0)` to `TEXTNUMBER` fields; the backend's `template-validation.ts` has no such rule, so a legitimate negative modifier (e.g. a stat penalty) would be silently rejected client-side only.
- FE validates `isReadOnly` fields as `required`; an `isReadOnly` + `required` template field could block form submission with no way for the user to fix it — a rule the backend never enforces.

Both exist because `browchar-api/src/characters/template-validation.ts` (imperative, hand-written) and `browchar-fe/src/lib/characters/character-schema.ts` (Zod, hand-written) independently reimplement the same `FieldType` → validation-rule mapping.

**Decision: move to option 3, scoped down.** Not "generate everything from Prisma" — `Character.values` / `Playbook.template` are plain `Json` columns, so there's no schema to infer from on that side. Concretely:

1. Add `packages/contracts` inside `browchar-api` (see location rationale below), containing:
   - The existing static Zod DTOs from `character.schemas.ts` (`createCharacterSchema`, `listCharactersQuerySchema`).
   - A new `buildTemplateSchema(template): z.ZodObject`, replacing `template-validation.ts`'s imperative rules, built from the `FieldType` mapping logic already written in the FE's `character-schema.ts` (it's the more complete of the two).
2. Publish `packages/contracts` as a versioned private package; `browchar-fe` consumes it as a normal dependency.
3. **Characters is the proof of concept** — both repos already touch this module. `characters.controller.ts`/`.service.ts` swap `validateValuesAgainstTemplate` for `buildTemplateSchema(...).safeParse(...)`; `character-schema.ts` on the FE deletes its own `fieldSchema`/`buildCharacterSchema` and imports the shared builder instead.
4. Once the PoC lands, remove the hand-written types this replaces (`character.types.ts` on both sides).

**Location — `packages/contracts` inside `browchar-api`, not a new repo:** avoids standing up a third repo plus a second GitHub Packages setup for a solo/small team. `browchar-api` already owns the Prisma schema these types describe, so it's the natural home. Trade-off: publishing is a manual `npm publish` step until either repo has CI (neither does yet — see "What to revisit").

**Why not option 2 (OpenAPI):** doesn't address the actual risk. `values`/`template` are dynamic, template-defined shapes — an OpenAPI spec would describe them as a generic `object`, so the FE would still need a hand-written Zod layer for exactly the part that just caused two real bugs. It would add `@nestjs/swagger` plus codegen tooling on top of two frameworks that already speak Zod natively, without touching the actual drift surface.

Tracked in DEV-153.

### 2. Local dev networking

- **Port collision**: API defaults to `PORT=3000` (`.env.example`) and Next's dev server also defaults to `3000`. Running both locally would otherwise silently bump one of them. **Resolved**: API stays on `3000`; the FE `dev` script is pinned to `next dev -p 3001` (`browchar-fe/package.json`), and `NEXT_PUBLIC_API_URL` continues to point at `3000`.
- **CORS**: **Resolved**. `app.enableCors({ origin: env.CORS_ORIGIN })` in `src/main.ts`, backed by a `CORS_ORIGIN` env var (`src/config/env.ts`, comma-separated list, defaults to `http://localhost:3001`) instead of a wildcard. Multiple origins can be set per environment via a comma-separated `CORS_ORIGIN` value.

### 3. Environment contract

`NEXT_PUBLIC_API_URL` (FE) and `PORT` / `CORS_ORIGIN` (API) are the actual seam between the repos. Document this pairing explicitly per environment (local/staging/prod) in each repo's `first-setup` skill, so cloning either repo alone tells you what the other side expects.

### 4. Auth boundary (forward-looking)

The API has no auth layer yet, but `rest-conventions.md` already assumes `Authorization: Bearer <token>`. Decide this now rather than after the fact:

- **Bearer JWT** (recommended): looser coupling, no CORS-credentials/cookie complexity, works cleanly if a second client (mobile) ever appears. Matches what's already documented.
- **Session cookies**: tighter FE/API coupling (`SameSite`, `credentials: include`, CORS credential mode), only worth it if first-party-only access is a hard requirement.

Recommend committing to bearer JWT to avoid a cookie/CORS redesign later.

### 5. Deployment topology

No deploy config exists in either repo yet. Given the polyrepo decision, deploy independently:

- FE → Vercel (idiomatic for Next.js).
- API → container host (Railway/Render/Fly) + managed Postgres.

`CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` become the per-environment config that ties a given FE deploy to a given API deploy — document required env vars per environment in each repo's README, rather than trying to co-deploy them.

## What to revisit as the system grows

- **Tooling duplication** (commit-conventions, pr-conventions, review-standards mirrored verbatim across both repos) is already a maintenance cost with just one contributor. If a second contributor joins, consider extracting a shared config package or reconsidering the monorepo decision.
- **Contract drift**: resolved 2026-07-11 — see Section 1. `packages/contracts` PoC scoped to Characters; extend to Playbooks/Campaigns as those modules grow. Open follow-ups: (a) `browchar-fe` still hand-maintains its domain types / `character-schema.ts` and won't derive from `@tpklabs/browchar-contracts` until the FE subtask lands, so drift risk persists on the FE side until then; (b) publishing is a manual `npm publish` (no CI) and the package is private, so consumers need a `read:packages` token — move to a GitHub Actions workflow using the built-in `GITHUB_TOKEN` once CI exists; (c) `packages/contracts` sits outside the repo's ESLint/Prettier gate (`npm run lint` and lint-staged target `src/**`) — extend the lint globs to `packages/**` or give the package its own lint.
- **Auth**: once implemented, confirm the bearer-JWT choice above before wiring CORS credentials.
