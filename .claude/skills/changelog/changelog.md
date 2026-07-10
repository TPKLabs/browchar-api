---
name: changelog
description: Guide for understanding, running, bypassing, or modifying the automatic CHANGELOG.md updater. Use when the user asks why CHANGELOG.md changed (or didn't), how to flag a known issue or a future consideration in a commit, or how to modify what gets logged.
---

# Changelog Automation

`CHANGELOG.md` in this repo does **not** log every commit. It only tracks three things, per release:

- **Fixed** — bugs that were actually resolved.
- **Known Issues** — bugs found but intentionally left unresolved, to be fixed later.
- **Future Considerations** — risks, conflicts, or follow-ups implied by a change made now.

Ordinary `feat`/`docs`/`refactor`/`chore`/etc. commits with no such implication are **not** logged — this file is a working list of things that need future attention, not a release log of everything shipped.

> This repo uses the same footer-driven model as `browchar-fe`, so the criteria for what gets logged (and how) match across front and back.

## How entries are generated

Commit via `npm run commit -- -m "type(scope): subject" [-m "body / footers"]` instead of a bare `git commit -m`. This wraps `git commit`:

1. `scripts/commit.mjs` joins the `-m` flags into the full commit message (subject + body + footers), same as `git commit` itself would.
2. Before invoking `git commit` at all, it runs the message through `scripts/lib/changelog.mjs`'s `applyChangelogUpdates`, which:
   - **Pass 1 — clean up first.** Checks the message for `Resolves-known-issue: <snippet>` footers. For each one, it looks through the *existing* `### Known Issues` entries in `CHANGELOG.md` for a bullet matching that snippet and removes it (dropping the `### Known Issues` heading too if that was the last one).
   - **Pass 2 — write new entries.**
     - **Subject line is `fix(...): ...`** → logs the description under `### Fixed`.
     - **Body/footer has a `Known-issue: <description>` line** → logs `<description>` under `### Known Issues`.
     - **Body/footer has a `Future-consideration: <description>` line** → logs `<description>` under `### Future Considerations`.
3. If anything changed, `CHANGELOG.md` is written and `git add`ed **before** `git commit` runs, so the update is already part of the index — no hook trickery needed, and no separate commit is created.
4. Only then does `scripts/commit.mjs` call the real `git commit -m "<message>"`, which triggers the normal pre-commit and commit-msg hooks exactly as if you'd run `git commit` directly.
5. A single commit can produce zero, one, or several effects (e.g. a `fix:` commit can resolve one known issue via `Resolves-known-issue:` *and* log a fresh one via `Known-issue:` in the same commit).
6. Merge commits, `fixup!`/`squash!` commits are skipped entirely.
7. Duplicate entries (exact same line already present) are not re-added.

See the `commit-conventions` skill for the exact footer syntax and examples (`Known-issue:` / `Future-consideration:` / `Resolves-known-issue:`).

### Why not a commit-msg hook?

An earlier version of this automation ran from `.husky/commit-msg` (`scripts/update-changelog.mjs`). That doesn't work: git computes the tree for the commit being created *before* the commit-msg hook runs, so a `git add` performed inside that hook only affects the *next* commit, not the one in progress — it silently leaves `CHANGELOG.md` staged and dangling instead of landing in the same commit. The same is true of `prepare-commit-msg`. Only changes staged before `git commit` starts (or from a `pre-commit` hook, which runs before the tree is computed but also before the message exists) can land in the commit being made — hence the wrapper script.

### If you commit without the wrapper

Running a bare `git commit -m "..."` still works and still passes lint-staged/typecheck/tests — it just skips the changelog automation. Unlike before, this repo's `.husky/commit-msg` still runs `scripts/warn-changelog.mjs`, which checks whether the message *would* have produced a changelog entry and, if `CHANGELOG.md` isn't already staged, prints a `[warn-changelog] ...` warning telling you to use `npm run commit` — it never blocks the commit, it's advisory only. If you see that warning and the commit should have logged something, add the `CHANGELOG.md` entry by hand, or amend: `npm run commit -- -m "$(git log -1 --pretty=%B)"` after `git reset --soft HEAD~1` re-runs the automation against the same message.

## Resolving vs. modifying a known issue

- **Fully resolved** → use the `Resolves-known-issue: <snippet>` footer. The snippet only needs to be a substring of the existing bullet (matched case-insensitively, in either direction), so a short phrase from the original entry is enough. No exact copy-paste required.
- **Partially resolved or reshaped** (the bug changed shape, or only part of it was fixed) → there's no automated footer for this. Edit the bullet directly in `CHANGELOG.md` as part of the same commit — the automation only ever *appends* or *removes exact matches*, it never rewrites text for you, so a manual edit is the correct move here.
- If `Resolves-known-issue:` doesn't match any existing bullet (typo, or it was already removed), `scripts/commit.mjs` logs a `[commit] no "Known Issues" entry matched` warning and proceeds with the commit anyway — it does not block it.

## Failure behavior

The changelog update never blocks a commit. All errors are caught and logged as a warning — a broken changelog update must never stop you from committing. Same for `scripts/warn-changelog.mjs`: it's advisory only and swallows its own errors.

## Changing what gets tracked

Edit `scripts/lib/changelog.mjs`:
- To log other commit types under `### Fixed` (or a new section), extend the block that checks `subjectMatch`.
- To add a new footer-driven section, add a new regex + `apply(...)` call following the `Known-issue`/`Future-consideration` pattern.
- To add a new "resolves" footer for another section (e.g. resolving a `Future Considerations` entry), add a new `resolve(...)` call using `removeMatchingBullet`, following the `Resolves-known-issue` pattern.

Both `scripts/commit.mjs` and `scripts/warn-changelog.mjs` import from this shared module, so a change here affects both the same-commit update and the bare-`git commit` warning.

## Cutting a release

This script only ever writes to `## [Unreleased]`. When releasing, manually rename that heading to `## [x.y.z] - YYYY-MM-DD` and add a fresh empty `## [Unreleased]` above it.
