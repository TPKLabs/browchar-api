# Frontend/Backend Repo Architecture

Status: Draft
Scope: Repo topology and the FE↔API integration seam
Last updated: 2026-07-09

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

### 1. Contract / type sharing

Current state: FE types are hand-written and can silently drift from what the API actually returns.

Options considered:

1. **Status quo** — manual sync, disciplined by `docs/api/rest-conventions.md` as source of truth.
2. **Generated client** — `@nestjs/swagger` on the API + `openapi-typescript`/`orval` on the FE to codegen types from a live OpenAPI spec.
3. **Shared `@browchar/contracts` package** — Zod schemas published as a versioned private package, consumed by both repos. Both sides already speak Zod (`nestjs-zod` on API, `zod` + `react-hook-form` on FE), so this is the lowest-friction option _if and when_ it's needed.

Recommendation: **defer (1)**, but treat it as the trigger-based decision it is — move to (3) once either of these happens:

- a third consumer of the API contract shows up (mobile app, second frontend, etc.), or
- type drift causes a real bug (not just a lint annoyance).

Don't build the shared package pre-emptively for two modules.

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
- **Contract drift**: move to the shared `@browchar/contracts` Zod package (Section 1, option 3) once a second consumer appears or drift causes a bug.
- **Auth**: once implemented, confirm the bearer-JWT choice above before wiring CORS credentials.
