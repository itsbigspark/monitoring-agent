# Project-owned docs

This directory holds **project-specific narrative documentation** — the
docs authored by the humans working on this repo (auth models, ADR
logs, runbooks, mental models, knowledge bases, incident write-ups,
handover notes, diagrams).

## Why a separate directory

`docs/` root is reserved for **kit-managed directories** that the
agent-harness kit ships and regenerates:

- `docs/ai/` — canonical agent context (product, tech stack, structure,
  security policies, testing standards, ...)
- `docs/standards/` — profile-derived standards references
- `docs/specs/` — spec-first tickets + `BACKLOG.md`

Mixing project-owned files at `docs/` root alongside kit-managed
directories creates two problems:

1. **Kit vs project ownership is unclear.** A newcomer can't tell at a
   glance which files the kit regenerates and which are hand-authored.
2. **Kit updates can surprise you.** As the kit evolves and adds new
   `docs/foo/` dirs, name collisions with project-owned files become
   more likely.

Keeping every project-owned narrative doc under `docs/project/` puts a
clean boundary between the two, and gives new contributors one place
to look.

## What belongs here

Everything project-specific and narrative:

- **`AUTH.md`** — how callers authenticate.
- **`DECISIONS.md`** — ADR-lite log of adopted / deferred decisions.
- **`RUNBOOK.md`** — sequenced operational procedures.
- **`incidents/`** — post-incident write-ups (if you keep them in-repo).
- **`design/`** or **`architecture/`** — design docs, mental models,
  system diagrams.
- **`kb/`** — knowledge base articles that don't fit elsewhere.
- **`diagrams/`** — source assets for diagrams referenced by the docs
  above.

## What does NOT belong here

- **Anything the kit generates** (`docs/ai/*.md`,
  `docs/standards/*.md`, adapter files under
  `.kiro/`, `.claude/`, `.cursor/`). Kit files stay at their generated
  paths.
- **`AGENTS.md` / `CLAUDE.md`** — canonical agent instructions belong
  at the repo root (they're bridges from the kit canonicals).
- **Reference material extracted from an external source** — if it's a
  copy of upstream docs, prefer a link or a `.gitattributes` /
  submodule pattern rather than duplicating content here.

## Editing / adding files

- Feel free to add whatever project-specific docs the repo needs.
- If you find yourself creating `docs/project/ai/` or similar naming
  that shadows a kit directory, rename it (`docs/project/ai-strategy/`)
  to keep the boundary clear.
- Cross-link generously — `docs/ai/` canonicals should reference
  `docs/project/*.md` when the canonical summary needs to link to the
  full narrative.

## Convention origin

This convention was formalised in
[HARNESS-DOCS-PROJECT-CONVENTION](https://github.com/itsbigspark/the-one-harness-kit/tree/main/docs/specs/HARNESS-DOCS-PROJECT-CONVENTION),
prompted by adoption experience on `the-one-ai-gateway` — where the
project's mature narrative docs (AUTH.md, DECISIONS.md, RUNBOOK.md,
kb-genai-gateway-observability.md, ui-edge.md) were mingling with
kit-managed dirs at `docs/` root until they were moved into
`docs/project/`.
