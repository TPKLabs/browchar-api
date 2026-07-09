---
name: pr-conventions
description: This project's conventions for branch names, PR titles, and PR body structure. Use when opening a new pull request, retitling/rewording an existing one, or checking whether a PR follows the repo's standards.
---

# PR conventions

These are this repo's conventions for how a pull request is named, structured,
and scoped. This is about the PR itself (branch, title, body, base) — for
reviewing the _code_ in a diff against project standards use the
`review-standards` skill; for commit message wording use the
`commit-conventions` skill. They match `browchar-fe`'s conventions so front
and back PRs look the same.

## Branch naming

- Ticket-driven work: `<TICKET>/<kebab-summary>`, e.g. `DEV-20/character-service`.
  The ticket ID is the source of truth for context — don't duplicate it
  elsewhere in the branch name.
- Non-ticket work (tooling, chores with no ticket): `<type>/<kebab-summary>`,
  e.g. `chore/tooling-setup`, using the same `type` prefixes as Conventional
  Commits (`chore`, `fix`, `feat`, ...).

## PR title

- Conventional Commits format: `type(scope): summary`, imperative mood, no
  trailing period — matches the primary commit's subject line
  (`feat(characters): add character creation endpoint`).
- If a branch has multiple commits, the title summarizes the PR as a whole,
  not just the last commit.

## PR body

Two sections, in this order:

### `## Summary`

Bullet points, one change per bullet, written for a reviewer who hasn't seen
the branch — state what changed and, where it's not obvious from the diff, why
(e.g. "moved validation into a Zod DTO because the controller was hand-checking
fields"). Don't restate the diff line-by-line; summarize at the level of a
changelog entry.

### `## Test plan`

A checklist of what was actually verified before opening the PR, checked
(`[x]`) only for things actually run — never pre-check as aspirational.
Always include the relevant subset of:

```
- [ ] npm run lint
- [ ] npx tsc --noEmit
- [ ] npm test
- [ ] npx prisma validate
```

Add manual verification steps (e.g. "hit the endpoint with curl and confirmed
the 400 on invalid input", "ran a migration against a scratch DB") when the
change touches endpoints, the schema, or anything the unit tests don't
exercise.

## Changelog

See the `changelog` skill for what goes in `CHANGELOG.md` and when — fixes and
forward-looking "Known Issues"/"Future Considerations" are logged per-commit
via footers as they're found, not just when a PR happens to be titled `fix`.
Before opening a PR, check that the `### Fixed` / `### Known Issues` lines this
branch's commits produced are correct.

## Base branch and scope

- Base is always `main` — this repo doesn't stack PRs.
- One branch per concern. If a branch accumulates unrelated changes (e.g. a
  service PR that also touches the Prisma schema for a different feature),
  split it rather than growing the PR's Summary to cover two stories.

## Before opening

Run the Test plan checklist for real, then open with the `review-standards`
skill in mind — a PR that will fail that review on obvious points (missing
paired specs, business logic in the controller) is better fixed first.
