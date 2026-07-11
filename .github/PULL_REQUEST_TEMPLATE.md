<!--
Title (see the `pr-conventions` skill for full detail):
Conventional Commits format: `type(scope): summary`, e.g.
"feat(characters): add character creation endpoint"
Imperative mood, no trailing period. Summarizes the whole PR, not just the
last commit. Include a `(DEV-XXX)` ticket reference at the end when the work
is ticket-driven.

Base branch is always `main`. One branch per concern — split unrelated changes
into separate PRs rather than growing this one.
-->

## Summary

-

## Test plan

- [ ] npm run lint
- [ ] npx tsc --noEmit
- [ ] npm test
- [ ] npx prisma validate

<!-- Add manual verification steps here if the change touches endpoints, the
schema, or anything the unit tests don't exercise. -->
