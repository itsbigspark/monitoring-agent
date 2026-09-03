# Agentic Coding Harness

**Status:** Draft v0.1
**Purpose:** Make agentic development consistent across Kiro, Claude Code,
Codex, Cursor, Copilot, and future coding agents in this repo.

Portable harness installed from `the-one-harness-kit`. The kit is the source for
the templates and checks; this file is generated into the consuming repo so it
can be reviewed and edited locally as the project evolves.

---

## 0. Thesis

The development environment should be swappable. Kiro, Claude Code, Codex,
Cursor, Copilot, and future agents should all consume the same project intent,
skills, quality gates, and safety rules.

This harness is the layer that makes that possible:

1. **Canonical project context** lives under `docs/ai/` (cross-agent neutral).
   `AGENTS.md` and `CLAUDE.md` remain at repo root for native tool discovery.
   The location is configurable via `canonicalsDir` in
   `agent-harness.config.json`; default `docs/ai/`.
2. **Skills** package repeatable workflows.
3. **Steering / memory / adapters** translate the same standards into each
   tool's native primitive.
4. **Quality gates** provide deterministic enforcement outside the LLM.

The important rule: agent instructions are helpful, but CI and scripts are
authoritative.

The context-loading rule: optimize active context per tool. Cross-agent files
(`AGENTS.md`, `CLAUDE.md`, the canonicals under `docs/ai/`) must never reference
paths inside another tool's namespace; canonical content lives at `docs/ai/`
(with `AGENTS.md` and `CLAUDE.md` at root for native discovery), and thin
tool-specific adapters import via each tool's native include syntax.

---

## 1. Canonical Files

The canonicals listed below live under the directory configured as
`canonicalsDir` in `agent-harness.config.json` (default `docs/ai/`). The two
exceptions stay at the repo root so each tool can discover them natively.

| File | Purpose |
|---|---|
| `AGENTS.md` (root) | Cross-agent repo instructions. Codex, Cursor, Copilot, Kiro, and Windsurf consume this directly; Claude imports it through `CLAUDE.md`. |
| `CLAUDE.md` (root) | Claude Code project memory and imports. Stays at root for native discovery. |
| `docs/ai/product.md` | Product overview. |
| `docs/ai/tech-stack.md` | Technology stack and protocols. |
| `docs/ai/structure.md` | Repo layout and naming conventions. |
| `docs/ai/code-conventions.md` | Coding standards. |
| `docs/ai/security-policies.md` | Security rules. |
| `docs/ai/testing-standards.md` | Testing rules. |
| `docs/ai/definition-of-done.md` | What "Done" means at the project level. |
| `docs/ai/agentic-coding.md` | Cross-agent governance for harness changes. |
| `docs/ai/agentic-coding-harness.md` | This file — the canonical map and governance for the harness. |
| `docs/specs/BACKLOG.md` | Auto-generated index of all active (non-Done) tickets, when workflow is enabled. |
| `tools/qa/*.mjs` | Deterministic checks used by gates. |
| `.kiro/steering/*.md` | Kiro adapters. Thin imports of canonicals via `#[[file:...]]`. |
| `.claude/skills/*/SKILL.md` | Claude Code skill wrappers. |
| `.agents/skills/*/SKILL.md` | Codex project skill wrappers. |
| `.cursor/rules/main.mdc` | Cursor adapter pointing to canonical instructions. |
| `.github/copilot-instructions.md` | GitHub Copilot adapter pointing to canonical instructions. |
| `.github/workflows/*.yml` | CI enforcement entrypoints. |
| `.pre-commit-config.yaml` | Local pre-commit enforcement entrypoint. |

---

## 2. Tool Adapters

### 2.1 Kiro

Kiro adapters live under `.kiro/steering/`, each a thin import of the matching
canonical via `#[[file:docs/ai/...]]` (or whatever `canonicalsDir` is
configured to). Inclusion modes (`always`, `fileMatch`, `manual`) come from
`agent-harness.config.json` `kiro.steering`.

**Drift guard:** every `.kiro/steering/*.md` must be registered in the
manifest's `kiro.steering` table. Adding a new steering file inside Kiro (e.g.
via the IDE's UI) without promoting it to canonical fails `harness:check` with
a 5-step remediation: (1) move content to the canonicals directory, (2)
replace the steering file with a thin `#[[file:...]]` adapter, (3) declare the
canonical in the manifest, (4) register the steering entry, (5) add a row in
§1 above.

Pre-commit (when configured) runs `npm run kiro:promote-steering:all` to
auto-promote any non-adapter steering content Kiro wrote during the session, so
this gate fires only when the user has actively created a new steering file the
manifest doesn't yet know about.

#### Personal vs project steering

Not every file in `.kiro/steering/` is project-canonical. Personal
AI-interaction preferences ("be concise", "use explicit confidence levels")
that the contributor wants in every project belong in **user scope**:
`~/.kiro/steering/<name>.md`. Personal preferences that only matter in this
repo belong in the **workspace-local personal namespace**:
`.kiro/steering/personal/<name>.md` (gitignored by convention).

The harness flags personal-shaped files automatically. The drift guard in
`harness:check` and the `kiro:promote-steering:all` pre-commit pass both
detect them via heuristic (bare-name filename like `alice.md`,
`# My personal instructions` header, or first-person markers in the first
~10 lines) and emit the user-scope suggestion instead of trying to promote
content that isn't canonical. Files under `.kiro/steering/personal/` are
silent — they don't need to appear in the manifest.

If a contributor commits a personal file by mistake, the right fix is to
move it to `~/.kiro/steering/<name>.md` (or `.kiro/steering/personal/<name>.md`
if it's repo-specific) and remove the workspace copy. The kit can't reach
into user scope on the contributor's behalf.

#### Specs

When `kiro.specFolders.enabled` is true, canonical specs live at
`<workflow.specsDir>/<ticket-id>/{requirements.md, design.md, tasks.md}` and
adapter imports live at `.kiro/specs/<ticket-id>/`. Adapters are auto-generated
by `npm run kiro:sync` (gated by `npm run kiro:check` in `gate:all`); do not
hand-author them.

The harness refuses to delete Kiro-native content silently — `kiro:check` fails
until the spec is promoted via `npm run kiro:promote <id>`. Pre-commit also
runs `npm run kiro:promote:all` so any Kiro-native spec edits land on canonical
before the gate fires.

### 2.2 Claude Code

Claude Code uses:

- `CLAUDE.md` for project memory (imports `@AGENTS.md`).
- `.claude/skills/` for project skill wrappers (`@`-import to canonical).

### 2.3 Codex

Codex uses:

- `AGENTS.md` for repository instructions (read natively).
- `.agents/skills/` for project skill discovery.

### 2.4 Cursor and Copilot

- Cursor: `.cursor/rules/main.mdc` — adapter pointing at `AGENTS.md`.
- GitHub Copilot: `.github/copilot-instructions.md` — same.

### 2.5 Future agents

Any future coding agent should have an adapter that answers:

1. How does it load project memory?
2. How does it discover task-specific skills?
3. How are permissions limited?
4. How are deterministic checks enforced?

If the tool reads `AGENTS.md` natively (as Codex, Cursor, Copilot, and Kiro
do), no new adapter is needed beyond ensuring the tool is configured to read
it.

---

## 3. Standard Agent Workflow

For any non-trivial implementation ticket:

1. Read the active spec under `<workflow.specsDir>/<ticket-id>/` if one exists,
   the harness docs only if doing harness work, and relevant steering.
2. Convert the ticket into testable requirements if missing (EARS-style).
3. Write or update the failing tests first.
4. Implement the smallest change that satisfies the tests.
5. Run local quality gates (`npm run gate:all`).
6. Update docs / specs if behavior changed.
7. Report what changed, what was verified, and what risk remains.

---

## 4. Harness Quality Gates

`npm run gate:all` runs all root-level harness gates configured in the
manifest. Common gates:

- `format:check` — trailing whitespace, CRLF, missing final newlines.
- `harness:check` — required canonicals exist; adapters stay thin and aligned
  with the manifest.
- `security:secrets` — regex sweep for AWS / GitHub / Anthropic key patterns
  and PEM blocks.
- `backlog:check` — backlog index matches frontmatter on every ticket
  (when workflow is enabled).
- `tasks:check` — Done tickets have ticked tasks and a real PR URL.
- `lifecycle:pr` — non-draft PR refers to the right ticket(s) with the right
  status.
- `mutation` — Stryker on safety-critical TS once those paths exist;
  auto-skips until then.

Pre-commit (`.pre-commit-config.yaml`) typically runs the fast gates only
(format, harness, backlog, Kiro adapter sync, tasks, secrets). Mutation runs
in CI as part of `gate:all` on every PR.

CI (`.github/workflows/ci.yml`) runs `npm run gate:all` and `npm run
lifecycle:pr` on every non-draft PR.

### 4.1 Deferred CI gates

Some CI jobs are present in their workflow files but disabled via
`if: ${{ false }}`. The disable comment in each workflow points back to this
section. Flip the `if:` to `true` (and remove the corresponding row from the
table below) when the listed condition is met.

| Gate | Workflow | Disable reason | Re-enable when |
|---|---|---|---|
| **CodeQL** (JS/TS SAST) | `.github/workflows/codeql.yml` job `analyze` | Upload requires GitHub Advanced Security (Code Security). Without GHAS, CodeQL can run analysis but `actions/codeql-action/upload-sarif` 403s. | GHAS / Code Security is enabled on this repo. |
| **Dependency review** | `.github/workflows/ci.yml` job `dependency-review` | `actions/dependency-review-action` needs GHAS. | GHAS is enabled on this repo. |
| **Gitleaks** (secret-history scan) | `.github/workflows/ci.yml` job `gitleaks` | `gitleaks/gitleaks-action@v2` requires a paid licence for org-owned repos. | A Gitleaks licence is provisioned for the org. The local secret check in `gate:all` covers the regex-sweep gap meanwhile. |

Each disabled job is one `if:` flip + the corresponding row removed. No
removal, no rewriting — keep the central record here so re-enabling is
mechanical.

---

## 5. Maintenance

Harness changes are done only when:

- All cross-agent files (`AGENTS.md`, `CLAUDE.md`, the canonicals under
  `docs/ai/`) and tool adapters do not contradict each other.
- New skills have clear activation descriptions.
- Any tool-specific file points back to canonical sources.
- Active hooks are not added without reviewed scripts and documented rollback.

Update `agent-harness.config.json` and canonical files first, then regenerate
or update tool-specific adapters, then run gates.

---

## 5.1 Context budget

Each coding agent (Kiro, Claude Code, Codex, Cursor, Copilot) auto-loads a
different set of canonical files into its context window on every interaction.
Without a structural budget, that context bloats silently — a contributor
adding a paragraph to any always-loaded file imposes cost on every agent turn.

The `check-context-budget` gate (run as part of `gate:all` after
`harness:check`) enforces the table below. **Soft threshold:** 0% to <20% over
budget emits a stderr warning, gate still passes. **Hard threshold:** ≥20%
over budget fails the gate. `Line_Count` is `wc -l` semantics (newline count).

Adding a new always-loaded file to a tool profile requires adding an explicit
per-file budget row first — the gate refuses to run otherwise.

Starter budgets are intentionally generous; tightening is a separate
maintenance pass.

### Per-file budgets

Paths are repo-root-relative — `AGENTS.md` lives at the repo root, the
remainder under the consumer's canonicals dir (`docs/ai/` by default). The
gate runs with `--base-dir .` so each entry below resolves against `<repo
root>/<path>`.

| File | Budget (lines) |
|---|---|
| AGENTS.md | 200 |
| docs/ai/README.md | 200 |
| docs/ai/product.md | 100 |
| docs/ai/tech-stack.md | 100 |
| docs/ai/structure.md | 100 |
| docs/ai/code-conventions.md | 100 |
| docs/ai/security-policies.md | 100 |
| docs/ai/testing-standards.md | 100 |
| docs/ai/definition-of-done.md | 100 |
| docs/ai/agentic-coding.md | 100 |
| docs/ai/agentic-coding-harness.md | 400 |

### Per-tool cumulative budgets

| Tool | Cumulative budget (lines) | Always-loaded files |
|---|---|---|
| codex | 1500 | AGENTS.md, docs/ai/product.md, docs/ai/tech-stack.md, docs/ai/structure.md, docs/ai/code-conventions.md, docs/ai/security-policies.md, docs/ai/testing-standards.md, docs/ai/definition-of-done.md, docs/ai/agentic-coding.md |
| cursor | 1500 | AGENTS.md, docs/ai/product.md, docs/ai/tech-stack.md, docs/ai/structure.md, docs/ai/code-conventions.md, docs/ai/security-policies.md, docs/ai/testing-standards.md, docs/ai/definition-of-done.md, docs/ai/agentic-coding.md |
| copilot | 1500 | AGENTS.md, docs/ai/product.md, docs/ai/tech-stack.md, docs/ai/structure.md, docs/ai/code-conventions.md, docs/ai/security-policies.md, docs/ai/testing-standards.md, docs/ai/definition-of-done.md, docs/ai/agentic-coding.md |
| kiro | 1800 | AGENTS.md, docs/ai/product.md, docs/ai/tech-stack.md, docs/ai/structure.md, docs/ai/code-conventions.md, docs/ai/security-policies.md, docs/ai/testing-standards.md, docs/ai/definition-of-done.md, docs/ai/agentic-coding.md, docs/ai/agentic-coding-harness.md |

Notes:
- `CLAUDE.md` is intentionally absent from the kit canonicals — Claude consumers
  receive it through the `claude` adapter where it is a thin import of
  `AGENTS.md`. Per-file rows for `CLAUDE.md` belong in consumer-side budget
  tables, not in the kit canonical.
- Globs (e.g. `.kiro/steering/*.md`) are deliberately not supported in v1 so
  every always-loaded file requires an explicit, reviewable per-file budget
  row.

---

## 6. Carve-out: paths in cross-agent files

Cross-agent files (`AGENTS.md`, `CLAUDE.md`, the canonicals under
`docs/ai/`, `agent-harness.config.json`) must never reference paths inside
another tool's namespace (`.kiro/`, `.claude/`, `.agents/`, `.cursor/`,
`.github/`). The thin tool-specific adapters do the cross-namespace work.

Carve-out: governance / inventory files (this `agentic-coding-harness.md`,
the manifest itself, the deferred-gate table above) may list adapter paths
because their job is to describe the topology. Adapter paths should not
appear in normative working-rule prose.
