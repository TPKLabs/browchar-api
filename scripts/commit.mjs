#!/usr/bin/env node
// Wrapper around `git commit` that applies CHANGELOG.md updates *before*
// git commit runs, so the update is staged as part of the same commit's
// tree. This can't be done from a commit-msg (or even prepare-commit-msg)
// hook: by the time either runs, git has already computed the tree for the
// commit being created, so a `git add` there only affects the *next*
// commit, never the current one. Staging CHANGELOG.md before `git commit`
// starts is the only way to get true same-commit inclusion.
//
// Usage: npm run commit -- -m "type(scope): subject" [-m "body / footers"] [git-commit-flags...]
// Mirrors `git commit -m` (repeatable -m flags are joined with a blank
// line, same as git itself). Any other flags are passed through to the
// underlying `git commit` untouched.
//
// If no -m is given (interactive edit), this delegates straight to a plain
// `git commit` — the final message isn't known until after the editor
// closes, which is too late to stage a changelog update beforehand, so the
// automation is skipped for that path.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { applyChangelogUpdates } from "./lib/changelog.mjs";

const CHANGELOG_PATH = "CHANGELOG.md";

function parseArgs(argv) {
  const messages = [];
  const passthrough = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "-m" && argv[i + 1] !== undefined) {
      messages.push(argv[i + 1]);
      i++;
    } else {
      passthrough.push(argv[i]);
    }
  }

  return {
    message: messages.length ? messages.join("\n\n") : null,
    passthrough,
  };
}

function updateChangelog(message) {
  if (!existsSync(CHANGELOG_PATH)) return;

  try {
    const changelog = readFileSync(CHANGELOG_PATH, "utf8");
    const { content, changed, warnings } = applyChangelogUpdates(
      changelog,
      message,
    );
    for (const warning of warnings) {
      console.warn(`[commit] ${warning}`);
    }
    if (changed) {
      writeFileSync(CHANGELOG_PATH, content);
      execFileSync("git", ["add", CHANGELOG_PATH], { stdio: "ignore" });
    }
  } catch (err) {
    console.warn(`[commit] changelog update skipped: ${err.message}`);
  }
}

function main() {
  const { message, passthrough } = parseArgs(process.argv.slice(2));

  if (!message) {
    execFileSync("git", ["commit", ...passthrough], { stdio: "inherit" });
    return;
  }

  updateChangelog(message);
  execFileSync("git", ["commit", ...passthrough, "-m", message], {
    stdio: "inherit",
  });
}

main();
