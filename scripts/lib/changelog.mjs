// Pure CHANGELOG.md editing logic, shared by scripts/commit.mjs.
//
// This has no filesystem or git side effects on purpose: it must be called
// *before* `git commit` runs (from the commit wrapper), not from a
// commit-msg/prepare-commit-msg hook. By the time those hooks run, git has
// already computed the tree for the commit being created, so any `git add`
// done there only affects the *next* commit instead of the current one.
// Staging CHANGELOG.md before `git commit` starts is the only way for the
// update to land in the same commit.
//
// Tracks three things, derived from the commit message, per the
// commit-conventions skill:
//   1. Bugs actually fixed        (`fix:` commit subject)          -> ### Fixed
//   2. Bugs found but left open   (`Known-issue:` footer)          -> ### Known Issues
//   3. Future implications/risks (`Future-consideration:` footer) -> ### Future Considerations
// Everything else (feat, docs, refactor, chore, ...) is intentionally NOT logged.
//
// Before writing anything new, it first checks the existing Known Issues for
// ones this commit resolves (`Resolves-known-issue:` footer) and removes them
// — so the file never accumulates issues that are already fixed.

const SUBJECT_RE = /^([a-z]+)(\(([a-zA-Z0-9/_-]+)\))?(!)?:\s+(.+)$/;
const TRAILER_LINE_RE = /^[A-Za-z][A-Za-z -]*:\s/;

// Trailer values can wrap across multiple lines (the commit-conventions skill
// asks for ~72-char wrapping), so a value keeps consuming lines until a blank
// line, another trailer, or the end of the message — then gets joined back
// into one sentence.
function collectTrailers(body, key) {
  const lines = body.split("\n");
  const startRe = new RegExp(`^${key}:\\s*(.*)$`, "i");
  const details = [];

  for (let i = 0; i < lines.length; i++) {
    const m = startRe.exec(lines[i].trim());
    if (!m) continue;

    const parts = m[1].trim() ? [m[1].trim()] : [];
    let j = i + 1;
    while (
      j < lines.length &&
      lines[j].trim() !== "" &&
      !TRAILER_LINE_RE.test(lines[j].trim())
    ) {
      parts.push(lines[j].trim());
      j++;
    }
    if (parts.length) details.push(parts.join(" "));
    i = j - 1;
  }

  return details;
}

function findUnreleasedBlock(content) {
  const unreleasedMatch = /^##\s+\[Unreleased\]\s*$/m.exec(content);
  if (!unreleasedMatch) return null;

  const start = unreleasedMatch.index + unreleasedMatch[0].length;
  const rest = content.slice(start);
  const nextHeadingMatch = /^##\s+\[/m.exec(rest);
  const end = nextHeadingMatch
    ? start + nextHeadingMatch.index
    : content.length;
  return { start, end };
}

function insertEntry(content, section, entry) {
  const block = findUnreleasedBlock(content);
  if (!block) return content;

  let body = content.slice(block.start, block.end);
  if (body.includes(entry)) return content; // avoid duplicates (e.g. re-running the wrapper)

  const sectionMatch = new RegExp(`^### ${section}\\s*$`, "m").exec(body);
  if (sectionMatch) {
    const insertPos = sectionMatch.index + sectionMatch[0].length;
    body = body.slice(0, insertPos) + "\n" + entry + body.slice(insertPos);
  } else {
    body = body.replace(/\s*$/, "") + `\n\n### ${section}\n${entry}\n`;
  }

  return (
    content.slice(0, block.start) +
    body +
    content.slice(block.end)
  ).replace(/\n{3,}/g, "\n\n");
}

// Removes the first bullet under `### section` whose text matches `snippet`
// (case-insensitive substring, checked in both directions so a short snippet
// can match a longer stored entry and vice versa). If the section ends up
// empty, its heading is removed too instead of leaving a dangling header.
// Returns `matched: false` (content unchanged) if nothing matched, so the
// caller can decide how to surface that.
function removeMatchingBullet(content, section, snippet) {
  const block = findUnreleasedBlock(content);
  if (!block) return { content, matched: false };

  const body = content.slice(block.start, block.end);
  const sectionMatch = new RegExp(`^### ${section}\\s*$`, "m").exec(body);
  if (!sectionMatch) return { content, matched: false };

  const contentStart = sectionMatch.index + sectionMatch[0].length;
  const afterHeading = body.slice(contentStart);
  const nextHeadingMatch = /^###? /m.exec(afterHeading);
  const contentEnd = nextHeadingMatch
    ? contentStart + nextHeadingMatch.index
    : body.length;

  const lines = body.slice(contentStart, contentEnd).split("\n");
  const needle = snippet.trim().toLowerCase();
  const idx = lines.findIndex((l) => {
    const text = l.trim().replace(/^-\s*/, "").toLowerCase();
    return text && (text.includes(needle) || needle.includes(text));
  });
  if (idx === -1) return { content, matched: false };

  lines.splice(idx, 1);
  const hasRemainingBullets = lines.some((l) => l.trim().startsWith("-"));

  const newBody = hasRemainingBullets
    ? body.slice(0, contentStart) + lines.join("\n") + body.slice(contentEnd)
    : body.slice(0, sectionMatch.index) + body.slice(contentEnd); // drop the now-empty heading too

  const newContent = (
    content.slice(0, block.start) +
    newBody +
    content.slice(block.end)
  ).replace(/\n{3,}/g, "\n\n");
  return { content: newContent, matched: true };
}

// Computes the updated CHANGELOG.md content for a given commit message.
// Returns `{ content, changed, warnings }` — pure, no I/O.
export function applyChangelogUpdates(changelogContent, message) {
  const lines = message.split("\n");
  const subject = lines[0].trim();
  const warnings = [];

  if (
    !subject ||
    subject.startsWith("Merge ") ||
    subject.startsWith("fixup!") ||
    subject.startsWith("squash!")
  ) {
    return { content: changelogContent, changed: false, warnings };
  }

  let content = changelogContent;
  let changed = false;

  const apply = (section, entry) => {
    const updated = insertEntry(content, section, entry);
    if (updated !== content) {
      content = updated;
      changed = true;
    }
  };
  const resolve = (section, snippet) => {
    const result = removeMatchingBullet(content, section, snippet);
    if (result.content !== content) {
      content = result.content;
      changed = true;
    }
    if (!result.matched) {
      warnings.push(
        `no "${section}" entry matched Resolves-known-issue: "${snippet}"`,
      );
    }
  };

  const body = lines.slice(1).join("\n");

  // Clean up resolved Known Issues *before* writing any new entry, so a
  // commit that both fixes an old known issue and introduces a new one
  // never leaves the stale entry behind.
  for (const snippet of collectTrailers(body, "Resolves-known-issue")) {
    resolve("Known Issues", snippet);
  }

  const subjectMatch = SUBJECT_RE.exec(subject);
  if (subjectMatch) {
    const [, type, , scope, , description] = subjectMatch;
    if (type === "fix") {
      apply("Fixed", `- ${scope ? `**${scope}:** ` : ""}${description}`);
    }
  }

  for (const detail of collectTrailers(body, "Known-issue")) {
    apply("Known Issues", `- ${detail}`);
  }
  for (const detail of collectTrailers(body, "Future-consideration")) {
    apply("Future Considerations", `- ${detail}`);
  }

  return { content, changed, warnings };
}
