# browchar-api — agent instructions

**The project instructions live in [`CLAUDE.md`](./CLAUDE.md). Read that file.**

This file exists because several coding agents look for `AGENTS.md` by
convention. It is deliberately a pointer and not a copy.

## Where things are

| What                                                    | Where                                                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Project instructions (stack, architecture, conventions) | [`CLAUDE.md`](./CLAUDE.md)                                                                          |
| Canonical skill bodies                                  | [`.claude/skills/`](./.claude/skills/)                                                              |
| Codex skill discovery adapters                          | [`.agents/skills/`](./.agents/skills/)                                                              |
| Agent definitions                                       | [`.claude/agents/`](./.claude/agents/) (Claude Code) · [`.codex/agents/`](./.codex/agents/) (Codex) |

The workflow content in `CLAUDE.md` and `.claude/skills/` is the single source
of truth regardless of which agent is reading it. `.agents/skills/` contains
only the small `SKILL.md` entrypoints Codex requires for discovery; each one
points to its canonical body instead of copying it.

## Do not mirror these files

There used to be a duplicate of `CLAUDE.md` in this file and a duplicate of
`.claude/skills/` under `.agents/skills/`. They drifted: a documented
environment variable (`JWT_SECRET`) was written up in one copy and missing from
the other, so whoever read the wrong one got stale setup instructions with no
way to tell.

If your tooling wants per-tool copies of these files, do not copy the workflow
body. Add a thin discovery adapter that points to the canonical path and keeps
only the metadata required by that tool.

Tool-specific **agent definitions** and skill discovery entrypoints are the
exceptions: they are genuinely different formats/locations per tool, while the
substantive instructions remain canonical.
