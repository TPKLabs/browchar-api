# browchar-api — agent instructions

**The project instructions live in [`CLAUDE.md`](./CLAUDE.md). Read that file.**

This file exists because several coding agents look for `AGENTS.md` by
convention. It is deliberately a pointer and not a copy.

## Where things are

| What                                                                                              | Where                                                                                               |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Project instructions (stack, architecture, conventions)                                           | [`CLAUDE.md`](./CLAUDE.md)                                                                          |
| Skills (first-setup, commit-conventions, pr-conventions, pre-commit, changelog, review-standards) | [`.claude/skills/`](./.claude/skills/)                                                              |
| Agent definitions                                                                                 | [`.claude/agents/`](./.claude/agents/) (Claude Code) · [`.codex/agents/`](./.codex/agents/) (Codex) |

Those paths are the single source of truth regardless of which agent is
reading this. `.claude/` is not Claude-specific content — it is just where this
repo keeps its agent instructions, and it is the directory that is committed
and reviewed.

## Do not mirror these files

There used to be a duplicate of `CLAUDE.md` in this file and a duplicate of
`.claude/skills/` under `.agents/skills/`. They drifted: a documented
environment variable (`JWT_SECRET`) was written up in one copy and missing from
the other, so whoever read the wrong one got stale setup instructions with no
way to tell.

If your tooling wants per-tool copies of these files, do not create them — read
the canonical paths above instead. `.agents/` is gitignored precisely so a
regenerated mirror cannot be committed and start drifting again.

Tool-specific **agent definitions** are the one exception: those are genuinely
different formats per tool (`.claude/agents/*.md` vs `.codex/agents/*.toml`),
not copies of the same content, so each tool keeps its own.
