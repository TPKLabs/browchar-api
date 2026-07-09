---
name: review-standards
description: Review a diff against this project's specific conventions (layered architecture, DI, Zod DTOs, Prisma access, paired specs) rather than generic code quality. Use for "review this against our standards" style requests; for a general correctness/security review use the code-reviewer agent instead.
---

# Review against this project's standards

This is a project-specific supplement, not a replacement for a general
correctness/security review (the `code-reviewer` agent). Run this when you want
the diff checked against conventions particular to this repo's stack (NestJS 11
/ Prisma / nestjs-zod / Jest), which a generic reviewer won't know. It's the
back-end counterpart of `browchar-fe`'s `review-standards` skill, so the bar is
the same on both sides.

Check the diff against each item below. Report only what's actually violated —
don't restate items that already comply.

## Layered architecture

- Requests flow **Controller → Service → (Repository/Prisma) → Database**; each
  layer keeps its responsibility. Controllers stay thin: they parse/validate
  input and delegate — no business logic or direct Prisma calls in a controller.
- Business logic lives in `@Injectable()` services, reached through Dependency
  Injection (constructor injection), not instantiated with `new`.
- Providers are registered in their module's `providers`/`exports` — a service
  used by another module must be exported, not re-instantiated.

## Types, DTOs & validation

- Request/response shapes come from Zod-based DTOs (`nestjs-zod`), not ad-hoc
  inline object checks. If a PR hand-validates fields a schema should own, flag
  it.
- These schemas are the contract the frontend mirrors (`browchar-fe`'s
  `src/lib/types`) — when you change a DTO's shape or validation message, note
  it so the front stays in sync.

## Database & Prisma

- Schema changes go through a Prisma migration; a change to `schema.prisma` with
  no accompanying migration is a finding.
- `prisma validate` must pass (also enforced by the pre-commit hook).

## Tests

- Every new file under `src/` has a sibling `*.spec.ts` (or `__tests__/*.spec.ts`),
  unless it's exempt (a `*.module.ts`, `*.dto.ts`, `*.entity.ts`, `*.interface.ts`,
  `*.types.ts`, a barrel `index.ts`, or `main.ts`). This is enforced
  mechanically by `scripts/check-test-pairs.mjs` in the pre-commit hook — if you
  see a new service/controller that should have failed that check, the hook may
  have been bypassed (`--no-verify`); call it out.
- Tests assert observable behavior (returned values, thrown exceptions, calls to
  mocked collaborators), not private internals.

## Formatting & commit hygiene

- No `console.*` in committed code (`no-console` is an ESLint error here).
- Code is Prettier-formatted and lint-clean (`npm run lint`).
- Commit messages follow Conventional Commits (enforced by commitlint on
  `commit-msg`, but worth a glance on PR titles/squash messages too).
