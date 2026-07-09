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

## How entries are generated

1. Every commit triggers husky's **commit-msg** hook (`.husky/commit-msg`), which runs `node scripts/update-changelog.mjs "$1"` — `$1` is the path to the file holding the full commit message (subject + body + footers).
2. `scripts/update-changelog.mjs` runs in two passes, in this order:
   - **Pass 1 — clean up first.** Before writing anything new, it checks the message for `Resolves-known-issue: <snippet>` footers. For each one, it looks through the *existing* `### Known Issues` entries in `CHANGELOG.md` for a bullet matching that snippet and removes it (dropping the `### Known Issues` heading too if that was the last one). This is what keeps the file from accumulating issues that have already been fixed.
   - **Pass 2 — write new entries.**
     - **Subject line is `fix(...): ...`** → logs the description under `### Fixed`.
     - **Body/footer has a `Known-issue: <description>` line** → logs `<description>` under `### Known Issues`.
     - **Body/footer has a `Future-consideration: <description>` line** → logs `<description>` under `### Future Considerations`.
3. A single commit can produce zero, one, or several effects (e.g. a `fix:` commit can resolve one known issue via `Resolves-known-issue:` *and* log a fresh one via `Known-issue:` in the same commit).
4. Merge commits, `fixup!`/`squash!` commits are skipped entirely.
5. `CHANGELOG.md` is re-staged with `git add` after being edited, so the update rides along in the *same* commit — no separate commit is created.
6. Duplicate entries (exact same line already present) are not re-added — this makes `git commit --amend` safe to run repeatedly.

See the `commit-conventions` skill for the exact footer syntax and examples (`Known-issue:` / `Future-consideration:` / `Resolves-known-issue:`).

## Resolving vs. modifying a known issue

- **Fully resolved** → use the `Resolves-known-issue: <snippet>` footer. The snippet only needs to be a substring of the existing bullet (matched case-insensitively, in either direction), so a short phrase from the original entry is enough. No exact copy-paste required.
- **Partially resolved or reshaped** (the bug changed shape, or only part of it was fixed) → there's no automated footer for this. Edit the bullet directly in `CHANGELOG.md` as part of the same commit — the hook only ever *appends* or *removes exact matches*, it never rewrites text for you, so a manual edit is the correct move here.
- If `Resolves-known-issue:` doesn't match any existing bullet (typo, or it was already removed), the script logs `[update-changelog] no "Known Issues" entry matched Resolves-known-issue: "..."` and moves on — it does not block the commit.

## Why footers, not commit type

A one-line subject (`fix(auth): ...`) can't carry enough detail to be useful later — "what's the known issue, exactly?" The `Known-issue:` / `Future-consideration:` footers force the detail to be written down at commit time, while the context is fresh, instead of relying on someone remembering to open a ticket.

## Failure behavior

The script never blocks a commit. All errors (missing `CHANGELOG.md`, malformed message, git failures) are caught and only logged as a warning (`[update-changelog] skipped: ...`) — the commit itself still succeeds, it just won't have a changelog entry.

## If a commit isn't being logged and you expected it to be

- Check the subject line matches `fix(scope): description` exactly (lowercase type, colon, space) if you expected a `### Fixed` entry.
- Check the footer line is spelled exactly `Known-issue:` or `Future-consideration:` (case-insensitive, but the hyphen and colon must be there).
- `feat`/`docs`/`refactor`/etc. commits with no footer are *correctly* not logged — that's the intended scope, not a bug.

## Bypassing

There's no dedicated flag for this hook specifically. To bypass every git hook (including this one), use `git commit --no-verify` (emergencies only — same guidance as the `pre-commit` skill).

## Changing what gets tracked

Edit `scripts/update-changelog.mjs`:
- To log other commit types under `### Fixed` (or a new section), extend the block that checks `subjectMatch`.
- To add a new footer-driven section, add a new regex + `apply(...)` call following the `Known-issue`/`Future-consideration` pattern.
- To add a new "resolves" footer for another section (e.g. resolving a `Future Considerations` entry), add a new `resolve(...)` call using `removeMatchingBullet`, following the `Resolves-known-issue` pattern.

## Cutting a release

This script only ever writes to `## [Unreleased]`. When releasing, manually rename that heading to `## [x.y.z] - YYYY-MM-DD` and add a fresh empty `## [Unreleased]` above it.
