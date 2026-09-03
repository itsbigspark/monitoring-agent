#!/usr/bin/env node
// Guard against silent ticket-status regression (issue #78, the OBS-003
// incident): when a Done spec's frontmatter moves to any non-Done status,
// the spec drops OUT of tasks:check's verification set — so the regression
// is invisible to every other gate and only surfaces when the backlog
// re-lists a completed ticket. This check compares each spec's on-disk
// status against the last committed version (git HEAD) and fails when a
// Done ticket has been reopened (or deleted) without explicit
// acknowledgement.
//
// Root-cause note (recorded so the design rationale survives): the .kiro
// spec adapters are one-line #[[file:...]] imports and cannot carry status;
// the OBS-003 Done→In-progress flip was working-tree state loss (a stale
// runtime writing back through the resolved import), not adapter→source
// sync — kiro:sync is one-way (docs → .kiro) by construction. This guard
// therefore defends the source of truth against ANY writer, rather than
// patching one suspected one.
//
// Usage:
//   node tools/qa/check-status-regression.mjs                    # gate mode
//   node tools/qa/check-status-regression.mjs --allow ID[,ID]    # sanctioned reopen
//   HARNESS_ALLOW_REOPEN=ID[,ID] node tools/qa/check-status-regression.mjs
//
// Exits non-zero if any spec whose committed (HEAD) status is Done is now
// non-Done or missing on disk, unless its ticket id is allow-listed.
// Passes silently (exit 0, with a note) when the workflow is not
// configured, the directory is not a git work tree, or HEAD does not exist
// yet (fresh repo) — the guard needs a committed baseline to compare against.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { HARNESS_PATHS } from "./harness-paths.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const TEMPLATE_DIR = "_template";
const DONE = "Done";

function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    console.error(`status:check: missing ${CONFIG_FILE}`);
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  if (!config.workflow?.specsDir) {
    console.log("status check skipped (workflow.specsDir not configured)");
    process.exit(0);
  }
  return { specsDir: config.workflow.specsDir };
}

function git(args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

export function parseStatus(text) {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const statusMatch = fmMatch[1].match(/^status:[^\S\n]*(.*)$/m);
  return statusMatch ? statusMatch[1].trim() : null;
}

function parseAllowList(argv, env) {
  const ids = new Set();
  const allowIndex = argv.indexOf("--allow");
  if (allowIndex !== -1 && argv[allowIndex + 1]) {
    for (const id of argv[allowIndex + 1].split(",")) ids.add(id.trim());
  }
  if (env.HARNESS_ALLOW_REOPEN) {
    for (const id of env.HARNESS_ALLOW_REOPEN.split(",")) ids.add(id.trim());
  }
  ids.delete("");
  return ids;
}

function headSpecDirs(specsDir) {
  // Directories under <specsDir> as of HEAD (name-only, one level).
  const result = git(["ls-tree", "--name-only", `HEAD:${specsDir}`]);
  if (result.status !== 0) return [];
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((name) => name && name !== TEMPLATE_DIR);
}

function headStatusFor(specsDir, dir) {
  const result = git(["show", `HEAD:${specsDir}/${dir}/requirements.md`]);
  if (result.status !== 0) return null; // not in HEAD → new ticket
  return parseStatus(result.stdout);
}

function main() {
  const { specsDir } = readConfig();
  const allowed = parseAllowList(process.argv.slice(2), process.env);

  if (git(["rev-parse", "--is-inside-work-tree"]).status !== 0) {
    console.log("status check skipped (not a git work tree)");
    return 0;
  }
  if (git(["rev-parse", "--verify", "HEAD"]).status !== 0) {
    console.log("status check skipped (no commits yet — nothing to compare against)");
    return 0;
  }

  const violations = [];
  let compared = 0;

  for (const dir of headSpecDirs(specsDir)) {
    const committedStatus = headStatusFor(specsDir, dir);
    if (committedStatus !== DONE) continue;

    const diskPath = join(specsDir, dir, "requirements.md");
    compared += 1;

    if (!existsSync(diskPath)) {
      if (allowed.has(dir)) continue;
      violations.push(
        `${dir}: committed status is Done but ${diskPath} is missing from the ` +
          `working tree — deleting a Done spec silently removes it from ` +
          `tasks:check verification. Restore it, or acknowledge the removal ` +
          `with --allow ${dir} (or HARNESS_ALLOW_REOPEN=${dir}).`
      );
      continue;
    }

    const diskStatus = parseStatus(readFileSync(diskPath, "utf8"));
    if (diskStatus === DONE) continue;
    if (allowed.has(dir)) continue;

    violations.push(
      `${dir}: status regressed Done → ${diskStatus ?? "(unparseable)"} in ` +
        `${diskPath}. docs/specs frontmatter is the source of truth and Done ` +
        `is terminal; a backwards move drops the spec out of tasks:check ` +
        `silently. If the edit was accidental, restore \`status: Done\`. If ` +
        `the reopen is intentional, re-run with --allow ${dir} (or ` +
        `HARNESS_ALLOW_REOPEN=${dir}) and say why in the commit message.`
    );
  }

  // Specs that exist only on disk are new work with no committed baseline —
  // out of scope for a regression guard.

  if (violations.length > 0) {
    console.error("status:check failed — Done-status regression detected:\n");
    for (const violation of violations) console.error(`  - ${violation}`);
    console.error(
      `\n${violations.length} violation(s) across ${compared} Done spec(s) compared against HEAD.`
    );
    return 1;
  }

  console.log(`status check passed (${compared} Done spec(s) compared against HEAD)`);
  return 0;
}

// Allow importing parseStatus for tests without executing the gate.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
