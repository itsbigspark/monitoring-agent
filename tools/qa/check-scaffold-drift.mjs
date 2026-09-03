#!/usr/bin/env node

// Scaffold drift check (HARNESS-GOLDEN-PATH-TEMPLATES).
//
// When the kit scaffold engine produces a new repo it records a content-hash
// baseline of every `kit_managed` file it wrote into
// `.agent-harness/scaffold-baseline.json`. This gate compares the current
// content of those files against that baseline and fails, naming each file,
// when a kit-owned file has been hand-edited — the scaffold-time analogue of
// `harness:check`. It catches a repo silently drifting from its golden path.
//
// Scope: `kit_managed` engine-written files only. Template-asset-origin
// project-shape files are deliberately NOT in the baseline — their
// updatability belongs to the asset registry, not the kit, so this check
// ignores them.
//
// No-op contract: a repo that was NOT produced by the scaffold engine has no
// `.agent-harness/scaffold-baseline.json`. The check passes silently in that
// case, so it is safe to ship in the default gate set for every consumer.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fail } from "./lib.mjs";

const BASELINE_FILE = ".agent-harness/scaffold-baseline.json";

function sha256(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

const baselinePath = join(process.cwd(), BASELINE_FILE);
if (!existsSync(baselinePath)) {
  // Not a scaffold-engine repo (or a retrofitted one) — nothing to check.
  console.log("scaffold drift check: no scaffold baseline — skipped.");
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
} catch (error) {
  fail([`${BASELINE_FILE} is not valid JSON: ${error.message}`]);
}

const files = Array.isArray(baseline?.kit_managed) ? baseline.kit_managed : [];
const errors = [];

for (const entry of files) {
  const targetPath = join(process.cwd(), entry.path);
  if (!existsSync(targetPath)) {
    errors.push(`${entry.path}: kit_managed file is missing — run 'agent-harness upgrade' to restore it.`);
    continue;
  }
  const actual = sha256(readFileSync(targetPath));
  if (actual !== entry.content_hash) {
    errors.push(
      `${entry.path}: drifted from the scaffolded kit baseline — ` +
        "run 'agent-harness upgrade' to take the current kit version, or revert the local edit."
    );
  }
}

if (errors.length > 0) {
  fail(["scaffold drift check failed:", ...errors]);
}

console.log(`scaffold drift check: ${files.length} kit_managed file(s) match the baseline — pass.`);
