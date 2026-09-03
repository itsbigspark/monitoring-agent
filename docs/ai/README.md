# Canonical AI-agent reference

This directory is the **canonical** source of truth for cross-agent project
context. Every coding agent the harness supports — Kiro, Claude Code, Codex,
Cursor, Copilot, Aider, Windsurf — is wired up to read from these files via
thin tool-specific bridges at the repo root or under each tool's namespace.

Location is configurable via `canonicalsDir` in `agent-harness.config.json`
(default `docs/ai/`).

## The rule

**Update files here. Leave the bridges alone.** The bridges
(`AGENTS.md`, `CLAUDE.md`, `.kiro/steering/*`, `.claude/agents/*`,
`.claude/skills/*`, `.agents/skills/*`, `.cursor/rules/main.mdc`,
`.github/copilot-instructions.md`) exist only to translate the canonicals here
into each tool's native include syntax. If you find yourself editing a bridge,
stop — the change probably belongs in the canonical.

The two exceptions that stay at the repo root:

- `AGENTS.md` — the cross-tool standard ([agents.md](https://agents.md/));
  Codex, Cursor, Copilot, Aider, Windsurf, and Kiro all discover it natively
  from root.
- `CLAUDE.md` — Claude Code project memory; loaded from root by default.

Both are thin pointers. They reference files in this directory.

## What lives here

The canonical files installed by `agent-harness init` are listed below. Any
file in this directory is fair game to add or remove — declare additions in
`agent-harness.config.json` `canonicals` and ensure `harness:check` still
passes.

| File | Purpose |
|---|---|
| `product.md` | Product overview |
| `tech-stack.md` | Technology stack |
| `structure.md` | Repo layout and naming conventions |
| `code-conventions.md` | Coding standards |
| `security-policies.md` | Security rules |
| `testing-standards.md` | Testing rules |
| `definition-of-done.md` | What "Done" means at the project level |
| `agentic-coding.md` | Cross-agent governance for harness changes |
| `agentic-coding-harness.md` | Canonical map and governance for the harness |

## How the bridges work

Each tool has a different include mechanism; the harness uses the native one
in each case so there's no manual sync:

- **Kiro** — `.kiro/steering/<name>.md` uses `#[[file:docs/ai/<canonical>.md]]`
  to import the canonical, with the right `inclusion:` mode (`always`,
  `fileMatch`, or `manual`) declared in the manifest.
- **Claude Code** — `CLAUDE.md` uses `@AGENTS.md`; `AGENTS.md` references
  files in this directory directly. `.claude/skills/*/SKILL.md` use `@`-import
  to canonical skills.
- **Codex** — reads `AGENTS.md` natively. `.agents/skills/*/SKILL.md` inline
  the canonical content (Codex doesn't follow `@`-imports).
- **Cursor** — `.cursor/rules/main.mdc` is a one-line pointer to `AGENTS.md`.
- **Copilot** — `.github/copilot-instructions.md` is a one-line pointer to
  `AGENTS.md`.

## Drift enforcement

`npm run gate:all` (which runs in pre-commit and CI) enforces:

- All canonicals listed in `agent-harness.config.json` exist
  (`tools/qa/check-harness.mjs`).
- Every Kiro steering adapter is a thin `#[[file:...]]` import with no inlined
  canonical content.
- Cursor and Copilot pointer adapters match expected content exactly (no
  drift).
- When workflow is enabled, the backlog index matches frontmatter on every
  ticket; Done tickets have ticked tasks and a real PR URL.
- Pre-commit auto-promotes Kiro-direct edits before any drift gate runs:
  - `npm run kiro:promote-steering:all` moves any non-adapter
    `.kiro/steering/*.md` content into the canonicals directory and restores
    the steering file as a thin adapter.
  - `npm run kiro:promote:all` does the same for specs.

## Project-owned narrative docs

The canonicals here (product / tech-stack / structure / conventions /
security / testing / etc.) are **agent-facing summaries**. Deep-detail
project docs — auth models, ADR logs, runbooks, mental models, KBs,
incident write-ups, diagrams — belong under `docs/project/` (a sibling
of `docs/ai/`), not at `docs/` root or inside `docs/ai/`.

Rationale + what belongs there: see `docs/project/README.md`, which the
kit scaffolds on init (HARNESS-DOCS-PROJECT-CONVENTION). Canonicals
here should reference `docs/project/*.md` where they need to link out
to full narrative for detail.

## Architecture credit

Pattern adopted from
[Internet Archive's Open Library](https://github.com/internetarchive/openlibrary/tree/master/docs/ai),
which uses the same canonical-layer-with-thin-bridges shape.
