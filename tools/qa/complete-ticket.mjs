#!/usr/bin/env node
// Mirror of pickup: flip a ticket to Done. Updates frontmatter status,
// updated date, and optionally links.pr. Runs npm run regen at the end.
//
// Usage:
//   npm run complete <ticket-id> --pr <url>   # mark Done with PR link (required by DoD)
//   npm run complete <ticket-id> --no-pr-yet  # mark Done with PR deferred
//   npm run complete <ticket-id> --pr <url>   # repair already-Done ticket missing links.pr
//
// --no-pr-yet is a TIME-BOUNDED escape hatch: tasks:check (in gate:all and
// pre-commit) blocks Done specs without an http(s) links.pr, so you must
// re-run with --pr <url> before the next commit or the gate fails.
//
// Refuses if:
//   - neither --pr nor --no-pr-yet provided
//   - both --pr and --no-pr-yet provided (ambiguous intent)
//   - --pr is provided without an http(s) URL value
//   - ticket is not In progress under the current git user.name (run pickup first)
//   - ticket id not found
// No-ops on already-Done unless --pr is provided to repair links.pr.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HARNESS_PATHS, normalizeCanonicalsDir } from "./harness-paths.mjs";
import {
  updateFrontmatterField,
  updateLinksPr
} from "./lib/frontmatter.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const TEMPLATE_DIR = "_template";

function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    console.error(`complete: missing ${CONFIG_FILE}`);
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  if (!config.workflow?.specsDir) {
    console.error("complete: workflow.specsDir not configured in manifest");
    process.exit(1);
  }
  return {
    specsDir: config.workflow.specsDir,
    canonicalsDir: normalizeCanonicalsDir(config.canonicalsDir)
  };
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function listSpecs(specsDir) {
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== TEMPLATE_DIR)
    .map((d) => {
      const reqPath = join(specsDir, d.name, "requirements.md");
      if (!existsSync(reqPath)) return null;
      const fm = parseFrontmatter(readFileSync(reqPath, "utf8"));
      if (!fm?.id) return null;
      return { dir: d.name, reqPath, fm };
    })
    .filter(Boolean);
}

function findSpecById(specsDir, id) {
  return listSpecs(specsDir).find((s) => s.fm.id === id) ?? null;
}

function gitUserName() {
  try {
    const name = execSync("git config user.name", { encoding: "utf8" }).trim();
    return name || "unassigned";
  } catch {
    return "unassigned";
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parsePrFlag(argv) {
  const prIdx = argv.indexOf("--pr");
  if (prIdx < 0) return null;
  const value = argv[prIdx + 1];
  if (!value || value.startsWith("--")) {
    throw new Error("--pr requires a URL value");
  }
  return value;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function printAvailable(specsDir) {
  const specs = listSpecs(specsDir);
  if (specs.length === 0) {
    console.error(`(no tickets found in ${specsDir}/)`);
    return;
  }
  console.error("Available tickets:");
  for (const s of specs.sort((a, b) => a.fm.id.localeCompare(b.fm.id))) {
    const status = s.fm.status ?? "?";
    const owner = s.fm.owner ?? "-";
    console.error(
      `  ${s.fm.id.padEnd(12)} ${status.padEnd(12)} ${owner.padEnd(16)} ${s.fm.title ?? ""}`
    );
  }
}

function regenScriptName() {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    return pkg.scripts?.regen ? "regen" : "backlog:generate";
  } catch {
    return "backlog:generate";
  }
}

function main() {
  const { specsDir, canonicalsDir } = readConfig();
  const id = process.argv[2];
  let pr;
  try {
    pr = parsePrFlag(process.argv);
  } catch (error) {
    console.error(`complete: ${error.message}`);
    process.exit(1);
  }
  const noPrYet = process.argv.includes("--no-pr-yet");

  if (!id || id.startsWith("--")) {
    console.error("usage: npm run complete <ticket-id> --pr <url>  [or --no-pr-yet to defer]");
    console.error("");
    printAvailable(specsDir);
    process.exit(1);
  }

  if (!pr && !noPrYet) {
    console.error("complete: --pr <url> is required (or --no-pr-yet to defer the PR link).");
    console.error(`Per ${canonicalsDir}/definition-of-done.md, links.pr must reflect the merged PR.`);
    process.exit(1);
  }
  if (pr && !isHttpUrl(pr)) {
    console.error(`complete: --pr must be an http(s) URL, got "${pr}".`);
    process.exit(1);
  }

  const found = findSpecById(specsDir, id);
  if (!found) {
    console.error(`complete: ticket "${id}" not found in ${specsDir}/`);
    console.error("");
    printAvailable(specsDir);
    process.exit(1);
  }

  const { dir, reqPath, fm } = found;
  const owner = gitUserName();

  let text = readFileSync(reqPath, "utf8");
  let prUpdated = false;
  if (pr) {
    text = updateLinksPr(text, pr);
    prUpdated = true;
  }

  if (fm.status === "Done") {
    if (prUpdated) {
      writeFileSync(reqPath, text);
      console.log(`complete: ${id} (${dir}) already Done; repaired links.pr → ${pr}.`);
      console.log("");
      console.log("Regenerating backlog...");
      execSync(`npm run ${regenScriptName()}`, { stdio: "inherit" });
    } else {
      console.log(`complete: ${id} is already Done. No-op.`);
    }
    return;
  }

  if (fm.status !== "In progress") {
    console.error(
      `complete: ${id} status is "${fm.status ?? "unknown"}" — pick it up before marking Done.`
    );
    console.error(`Run: npm run pickup ${id}`);
    process.exit(1);
  }

  if (!fm.owner || fm.owner === "unassigned" || fm.owner !== owner) {
    console.error(
      `complete: ${id} owner is "${fm.owner ?? "unset"}" — only the current owner (${owner}) can flip Done.`
    );
    console.error(
      `Coordinate with them, or take ownership first: npm run pickup ${id}`
    );
    process.exit(1);
  }

  text = updateFrontmatterField(text, "status", "Done");
  text = updateFrontmatterField(text, "updated", todayISO());
  writeFileSync(reqPath, text);

  console.log(
    `complete: ${id} (${dir}) → Done${pr ? `, PR ${pr}` : " (PR deferred — re-run with --pr <url> to set links.pr)"}, updated ${todayISO()}`
  );
  console.log("");
  console.log("Regenerating backlog...");
  execSync(`npm run ${regenScriptName()}`, { stdio: "inherit" });
  console.log("");
  console.log("Heads-up: tasks:check (in gate:all + pre-commit) will fail if");
  console.log("tasks.md still has unticked checkboxes or links.pr is deferred — tick completed");
  console.log("tasks, delete out-of-scope items (note in PR), and set --pr before committing.");
  console.log("");
  console.log("Next:");
  console.log(`  git add ${reqPath}`);
  console.log(`  git commit -m 'chore(${id.toLowerCase()}): mark done'`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
