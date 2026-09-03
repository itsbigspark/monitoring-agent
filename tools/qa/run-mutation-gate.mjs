#!/usr/bin/env node
// Mutation gate. Auto-skips when no safety-critical TS implementation
// exists (only types / interfaces). Activates once any of the configured
// safety paths contain real implementation.
//
// Configure safety paths in agent-harness.config.json under
// `mutation.safetyPaths` (array of repo-relative paths). The default paths
// below are reasonable starters; override per repo as needed.

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { HARNESS_PATHS } from "./harness-paths.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const DEFAULT_SAFETY_MARKERS = [
  "packages/shared/src/schemas",
  "packages/shared/src/validators",
  "packages/shared/src/permissions",
  "apps/frontend/src/auth",
  "apps/frontend/src/permissions"
];

function safetyMarkers() {
  if (!existsSync(CONFIG_FILE)) return DEFAULT_SAFETY_MARKERS;
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
    if (Array.isArray(config.mutation?.safetyPaths) && config.mutation.safetyPaths.length > 0) {
      return config.mutation.safetyPaths;
    }
  } catch {
    // fall through
  }
  return DEFAULT_SAFETY_MARKERS;
}

const markers = safetyMarkers();
const hasSafetyCode = markers.some((path) => existsSync(path));

if (!hasSafetyCode) {
  console.log(
    "mutation: no safety-critical implementation at configured paths; gate auto-skipped. Activates when configured paths land."
  );
  process.exit(0);
}

if (!existsSync("package.json")) {
  console.error("mutation: package.json missing");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const deps = {
  ...pkg.dependencies,
  ...pkg.devDependencies
};

if (!deps["@stryker-mutator/core"]) {
  console.error("mutation: safety-critical code exists but @stryker-mutator/core is not configured");
  process.exit(1);
}

const runner = existsSync("pnpm-lock.yaml") ? "pnpm" : "npx";
const args = runner === "pnpm" ? ["exec", "stryker", "run"] : ["stryker", "run"];
const result = spawnSync(runner, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
