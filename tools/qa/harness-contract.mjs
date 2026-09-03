// Stable capability labels the kit advertises. Each entry pairs with a row in
// the README's "Versioning and capabilities" table; the parity test in
// tests/expose-capabilities.test.mjs enforces that both sides stay in sync.
//
// Adding a capability:
//   1. Land the behaviour change behind tests in this kit.
//   2. Bump package.json `version` per semver.
//   3. Append the new label to KIT_CAPABILITIES below.
//   4. Add a matching row to the README capability table.
//   5. Record the new label + minimum kit version in the parity test's
//      `expectedMinimumVersion` map so future drift is detected.
export const KIT_CAPABILITIES = Object.freeze([
  "HARNESS-PROPAGATION",
  "HARNESS-SKILL-DIRECTORY-PROJECTION",
  "HARNESS-GENERATE-SYNC",
  "HARNESS-PRE-COMMIT-HOOK",
  "HARNESS-POWERS-FIELD",
  "HARNESS-PRE-COMMIT-HOOK-FIELD",
  // Self-referential: the kit advertises that it advertises its capabilities.
  // Consumers can use this to detect at runtime whether they're talking to a
  // kit that supports structured capability checks at all.
  "HARNESS-EXPOSE-CAPABILITIES",
  "HARNESS-CHECK-PER-ASSET",
  "HARNESS-CONTEXT-BUDGET-GATE",
  "HARNESS-KIT-PRECOMMIT-TEMPLATE",
  "HARNESS-STATUS-REGRESSION-GUARD",
  "HARNESS-PROJECT-DESCRIPTOR-SCAFFOLD",
  "HARNESS-SHARED-APPLICATION-GATE-CALLER",
  "HARNESS-TEMPLATE-CONTENT-DIGEST-V1",
  "HARNESS-FRAMEWORK-SKILL-CONFORMANCE",
  "HARNESS-PINNED-SCAFFOLD-REVISION",
  "HARNESS-SHARED-APPLICATION-BUILD-CALLER",
  "HARNESS-SHARED-PACKAGE-ECOSYSTEM-CALLERS"
]);

export const SHARED_APPLICATION_GATE_WORKFLOW =
  "itsbigspark/the-one-continuous-integration/.github/workflows/application-gate.yml";
export const SHARED_APPLICATION_GATE_COMMAND = "npm run gate:all";
export const SHARED_APPLICATION_PR_CHECK_COMMAND = "npm run lifecycle:pr";
export const SHARED_APPLICATION_BUILD_WORKFLOW =
  "itsbigspark/the-one-continuous-integration/.github/workflows/application-build.yml";
export const BIGSPARK_PACKAGE_ECOSYSTEMS = Object.freeze(["none", "python"]);

export const ADAPTERS = Object.freeze(["codex", "claude", "cursor", "copilot", "kiro", "github-ci"]);
export const WORKFLOW_MODES = Object.freeze(["none", "backlog", "specs-tasks-backlog"]);
export const COMPLETION_MODES = Object.freeze(["none", "manual", "in-pr"]);
export const SKILL_MANAGERS = Object.freeze(["kit", "repo", "asset-manager"]);
export const STEERING_MODES = Object.freeze(["always", "fileMatch", "manual"]);

export const GATE_SCRIPTS = Object.freeze({
  format: "format:check",
  harness: "harness:check",
  // context-budget runs after harness so it catches files harness produces.
  // The default consumer manifest mirrors this ordering. See
  // HARNESS-CONTEXT-BUDGET-GATE-PROPAGATION.
  "context-budget": "check-context-budget",
  profiles: "profiles:check",
  workflow: "workflow:check",
  secrets: "security:secrets",
  backlog: "backlog:check",
  tasks: "tasks:check",
  // status-regression runs after tasks so its failure lands next to the gate
  // it protects: tasks:check only verifies specs currently marked Done, so a
  // Done→non-Done flip silently shrinks tasks:check's coverage. See
  // HARNESS-STATUS-REGRESSION-GUARD (issue #78).
  "status-regression": "status:check",
  // scaffold-drift is a no-op unless the repo was produced by the kit scaffold
  // engine (HARNESS-GOLDEN-PATH-TEMPLATES) — it reads
  // .agent-harness/scaffold-baseline.json and passes silently when absent, so
  // it is safe to ship in the default gate set for non-scaffolded consumers.
  "scaffold-drift": "scaffold-drift:check",
  lifecycle: "lifecycle:pr",
  mutation: "mutation"
});

export const GATE_COMMANDS = Object.freeze({
  "format:check": "node tools/qa/check-format.mjs",
  "harness:check": "node tools/qa/check-harness.mjs",
  // No CLI flags here on purpose: the script defaults to cwd as --base-dir
  // and docs/ai/agentic-coding-harness.md as --doc, which matches how
  // consumers receive the canonical doc via init.
  "check-context-budget": "node tools/qa/check-context-budget.mjs",
  "profiles:check": "node tools/qa/check-profiles.mjs",
  "workflow:check": "node tools/qa/check-workflow.mjs",
  "security:secrets": "node tools/qa/check-secrets.mjs",
  "backlog:check": "node tools/qa/generate-backlog.mjs --check",
  "tasks:check": "node tools/qa/check-tasks-done.mjs",
  "status:check": "node tools/qa/check-status-regression.mjs",
  "scaffold-drift:check": "node tools/qa/check-scaffold-drift.mjs",
  "lifecycle:pr": "node tools/qa/check-lifecycle.mjs --pr",
  mutation: "node tools/qa/run-mutation-gate.mjs"
});

// Extra package scripts derived from the manifest. Groups are keyed either by
// a known gate name (backlog, tasks, lifecycle — installed alongside the gate)
// or a known adapter name (kiro — installed when the adapter is enabled). The
// installer in scripts/agent-harness.mjs decides when to apply each group.
// These are not part of gate:all but consumers can run them manually or wire
// them into pre-commit.
export const EXTRA_SCRIPTS = Object.freeze({
  backlog: Object.freeze({
    "backlog:generate": "node tools/qa/generate-backlog.mjs",
    regen: "npm run backlog:generate && npm run kiro:sync || npm run backlog:generate"
  }),
  tasks: Object.freeze({
    pickup: "node tools/qa/pickup-ticket.mjs",
    complete: "node tools/qa/complete-ticket.mjs"
  }),
  lifecycle: Object.freeze({
    "lifecycle:complete-merged-pr": "node tools/qa/check-lifecycle.mjs --complete-merged-pr"
  }),
  harness: Object.freeze({
    "harness:reconcile": "node tools/qa/reconcile-harness.mjs"
  }),
  kiro: Object.freeze({
    "kiro:sync": "node tools/qa/sync-kiro-specs.mjs",
    "kiro:check": "node tools/qa/sync-kiro-specs.mjs --check",
    "kiro:promote": "node tools/qa/sync-kiro-specs.mjs --promote",
    "kiro:promote:all": "node tools/qa/sync-kiro-specs.mjs --promote-all --force",
    "kiro:promote-steering": "node tools/qa/promote-kiro-steering.mjs",
    "kiro:promote-steering:all": "node tools/qa/promote-kiro-steering.mjs --all --force"
  })
});
