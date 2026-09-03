# Agent Instructions

These instructions apply to the whole repository unless a deeper `AGENTS.md`
overrides them.

## Project Context

The canonical (cross-agent) project context lives under `docs/ai/`. If your
`agent-harness.config.json` sets a different `canonicalsDir`, the bullets
below will reflect it after the next `agent-harness generate`.

- Harness manifest: `agent-harness.config.json`
<!-- KIT-CANONICALS:BEGIN -->
- `docs/ai/agentic-coding-harness.md`
- `docs/ai/agentic-coding.md`
- `docs/ai/definition-of-done.md`
- `docs/ai/product.md`
- `docs/ai/tech-stack.md`
- `docs/ai/structure.md`
- `docs/ai/code-conventions.md`
- `docs/ai/security-policies.md`
- `docs/ai/testing-standards.md`
<!-- KIT-CANONICALS:END -->
- Generated standards profiles: `docs/standards/`

The canonicals block above is managed by `agent-harness generate` from the
`canonicals[]` array in `agent-harness.config.json`. Edit the manifest, not
this list. Surrounding prose is yours to edit freely.

## Working Rules

- Prefer tests before implementation for behavior changes.
- Treat security and permission checks as server-side responsibilities.
- Do not commit secrets or real customer data.
- Keep docs and specs aligned when behavior changes.

## Picking up work

If `workflow.mode` is enabled in the manifest, tickets live under the configured
`workflow.specsDir`. Use `npm run pickup <ticket-id>` to claim work and
`npm run complete <ticket-id> --pr <url>` before merge. Both refuse to take
ownership of a ticket already claimed by another git user.

For genuine no-ticket work, include `NO-TICKET` in the PR title or body so the
lifecycle gate can skip ticket validation.

## Quality Gates

Before finishing code changes, run:

```bash
npm run gate:all
```

If a gate cannot be run, state why and what risk remains.
