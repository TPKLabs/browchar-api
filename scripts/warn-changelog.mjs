#!/usr/bin/env node
// Safety net for commits made with a bare `git commit` instead of
// `npm run commit`. The actual CHANGELOG.md update only happens in
// scripts/commit.mjs (staged *before* `git commit` runs, so it lands in the
// same commit — see that file for why a commit-msg hook can't do this
// itself). This script can't fix a bare `git commit` after the fact, but it
// can warn: if the message would have produced a changelog entry and
// CHANGELOG.md isn't already staged, the entry is about to be silently
// skipped.
//
// Invoked by the `commit-msg` husky hook — must never throw/exit non-zero,
// this is advisory only and must never block a commit.
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { applyChangelogUpdates } from "./lib/changelog.mjs";

const CHANGELOG_PATH = "CHANGELOG.md";

function main() {
  const commitMsgFile = process.argv[2];
  if (!commitMsgFile || !existsSync(CHANGELOG_PATH)) return;

  const message = readFileSync(commitMsgFile, "utf8");
  const changelog = readFileSync(CHANGELOG_PATH, "utf8");
  const { changed } = applyChangelogUpdates(changelog, message);
  if (!changed) return;

  const stagedFiles = execSync("git diff --cached --name-only", {
    encoding: "utf8",
  });
  const alreadyStaged = stagedFiles
    .split("\n")
    .some((f) => f.trim() === CHANGELOG_PATH);
  if (alreadyStaged) return;

  console.warn(
    `[warn-changelog] this commit would update ${CHANGELOG_PATH}, but it wasn't staged — ` +
      `use "npm run commit -- -m \\"...\\"" instead of a bare "git commit" to have it land in the same commit.`,
  );
}

try {
  main();
} catch (err) {
  console.warn(`[warn-changelog] skipped: ${err.message}`);
}
