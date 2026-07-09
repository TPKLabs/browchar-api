---
name: commit-conventions
description: Team standard for writing git commit messages. Use this skill whenever you write, generate, suggest, or review a commit message — including when staging changes, after editing code, when asked to "commit this", or when proposing a message for a diff. Apply it even if the user does not explicitly mention "conventions" or "Conventional Commits".
---

# Commit Conventions

This skill defines how commit messages are written for this team. Every commit message must follow these rules. The goal is a clean, scannable history where any teammate can understand *what changed and why* by reading the log, and where tooling (changelogs, semantic versioning) can parse the messages automatically.

## Core rules

1. **Write in English.** Always, regardless of the language used to describe the task. If the task is described in Spanish, translate the intent into a clear English commit message.
2. **Follow Conventional Commits.** The subject line has the form `type(scope): description`.
3. **Be descriptive of the work done.** The description must make the actual change obvious. A reader should understand what was done without opening the diff. Avoid vague messages like `fix bug` or `update code`.

## Subject line format

```
type(scope): description
```

- **type** — required. One of the allowed types below.
- **scope** — optional. The area of the codebase affected, in parentheses (e.g. `auth`, `api`, `ui`). Omit it if no single scope fits.
- **description** — required. A short summary of the change.

Rules for the description:
- Use the **imperative mood**: write it as if completing the sentence "If applied, this commit will…". So `add`, not `added` or `adds`.
- Start with a **lowercase** letter.
- **No period** at the end.
- Keep it concise — aim for **50 characters or fewer**, hard limit ~72.

## Allowed types

Choose the type that best describes the *purpose* of the change:

- **feat** — a new feature for the user.
- **fix** — a bug fix.
- **docs** — documentation only (README, comments, guides).
- **style** — formatting, whitespace, semicolons; no change to code behavior.
- **refactor** — a code change that neither fixes a bug nor adds a feature.
- **perf** — a change that improves performance.
- **test** — adding or correcting tests.
- **build** — changes to the build system or external dependencies.
- **ci** — changes to CI configuration or scripts.
- **chore** — maintenance tasks that don't touch src or tests (e.g. bumping versions).
- **revert** — reverts a previous commit.

If a change spans several types, pick the one that reflects its main intent, or split it into separate commits.

## Body (optional)

Add a body when the *what* in the subject isn't enough and the *why* matters. Separate it from the subject with one blank line. Use it to explain motivation, context, or trade-offs — not to repeat the diff. Wrap lines at ~72 characters.

## Footer (optional)

- **Breaking changes:** add `!` after the type/scope (e.g. `feat(api)!: ...`) **and** a footer line starting with `BREAKING CHANGE:` describing the break and the migration path.
- **References:** link related issues or tickets in the footer (e.g. `Refs: #123` or `Closes #123`).
- **Known issues:** if the commit surfaces a bug that is *not* being fixed now, add a footer line `Known-issue: <description>`. This is picked up automatically and logged in `CHANGELOG.md` under "Known Issues" — see the `changelog` skill. Be specific enough that someone picking it up later doesn't need to re-discover the bug.
- **Future considerations:** if the commit makes a decision, trade-off, or change that has implications, risks, or required follow-ups later (migration paths, potential conflicts, things that will need revisiting), add a footer line `Future-consideration: <description>`. This is also logged automatically in `CHANGELOG.md` under "Future Considerations". Detail *what* the consideration is and *why* it matters — not just "revisit this".
- **Resolving a known issue:** before writing a commit, check `CHANGELOG.md`'s `### Known Issues` section — if this change fixes one of those entries, add a footer line `Resolves-known-issue: <snippet of the existing entry>`. The snippet just needs to match part of the existing bullet text; it removes that entry from `CHANGELOG.md` (and drops the section header too if it was the last one) instead of leaving a stale issue around. If the change only partially resolves or reshapes a known issue rather than fully fixing it, edit the bullet text in `CHANGELOG.md` directly in the same commit instead — the footer is for full removals only.

## Examples

The Input is a description of the task performed; the Output is the commit message it should produce.

**Example 1 — simple feature**
Input: Agregué login con Google usando OAuth
Output: `feat(auth): add Google OAuth login`

**Example 2 — bug fix with scope**
Input: Corregí el cálculo del total del carrito que ignoraba los descuentos
Output: `fix(cart): include discounts in total calculation`

**Example 3 — no obvious scope**
Input: Actualicé las dependencias del proyecto
Output: `chore: update project dependencies`

**Example 4 — needs a body for context**
Input: Cambié el almacenamiento de sesiones de memoria a Redis porque se perdían al reiniciar
Output:
```
refactor(session): store sessions in Redis

Sessions were kept in memory and lost on every restart, logging
users out. Redis persists them across restarts and enables
horizontal scaling.
```

**Example 5 — breaking change**
Input: Cambié la respuesta del endpoint de usuarios, ahora devuelve un objeto en vez de un array
Output:
```
feat(api)!: return user object instead of array

BREAKING CHANGE: GET /users now returns a paginated object
{ data, total } instead of a bare array. Clients must read
the `data` field.
```

**Example 6 — fix with a known issue left open**
Input: Arreglé el timeout en el login, pero noté que los tokens expirados no invalidan la sesión — eso lo dejamos para después
Output:
```
fix(auth): resolve login request timeout

Known-issue: expired tokens don't invalidate the session server-side,
so a stale session can still make authenticated requests until the
token is refreshed. Needs a session-invalidation check on token expiry.
```

**Example 7 — change with a future consideration**
Input: Cambié el seed de desarrollo para usar IDs incrementales en vez de UUIDs, más fácil para debuggear
Output:
```
chore(seed): use incremental ids in dev seed data

Future-consideration: dev seed IDs no longer match the UUID format
used in staging/prod. Any fixture or test that hardcodes a UUID-shaped
id will need updating if it starts asserting on id format.
```

**Example 8 — fix that resolves an existing known issue**
Input: Arreglé que los tokens expirados no invalidaban la sesión (ya estaba anotado como known issue)
Output:
```
fix(auth): invalidate session on token expiry

Resolves-known-issue: expired tokens don't invalidate the session
```

## Common mistakes to avoid

- `Fixed login bug` → wrong tense and capitalization, no type. Use `fix(auth): handle empty password on login`.
- `update` → not descriptive, no type. Say what was updated and why.
- `feat: Added new dashboard.` → past tense, capitalized, trailing period. Use `feat: add new dashboard`.
- Mixing unrelated changes in one commit → split them so each commit has a single clear purpose.
