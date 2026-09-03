#!/usr/bin/env node
// Pickup a ticket: flip its frontmatter to In progress, set owner from
// git config user.name, bump the updated date, then run regen so
// BACKLOG.md (and Kiro adapters, if Kiro is enabled) reflect the change.
//
// Usage:
//   npm run pickup <ticket-id>           # claim a ticket as In progress
//   npm run pickup                       # no id → list available tickets
//
// Exits non-zero if:
//   - no ticket id provided
//   - ticket id not found in any <specsDir>/<dir>/requirements.md
//   - ticket already In progress under a DIFFERENT owner

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HARNESS_PATHS, normalizeCanonicalsDir } from "./harness-paths.mjs";
import { updateFrontmatterField } from "./lib/frontmatter.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const TEMPLATE_DIR = "_template";

function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    console.error(`pickup: missing ${CONFIG_FILE}`);
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  if (!config.workflow?.specsDir) {
    console.error("pickup: workflow.specsDir not configured in manifest");
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
    console.error(`  ${s.fm.id}  ${status.padEnd(12)} ${owner.padEnd(16)} ${s.fm.title ?? ""}`);
  }
}

function regenScriptName() {
  // Use `npm run regen` if defined; fall back to backlog:generate alone.
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
  if (!id) {
    console.error("usage: npm run pickup <ticket-id>");
    console.error("");
    printAvailable(specsDir);
    process.exit(1);
  }

  const found = findSpecById(specsDir, id);
  if (!found) {
    console.error(`pickup: ticket "${id}" not found in ${specsDir}/`);
    console.error("");
    printAvailable(specsDir);
    process.exit(1);
  }

  const { dir, reqPath, fm } = found;
  const owner = gitUserName();

  // Don't reopen Done tickets per Definition of Done. File a new ticket
  // referencing the original instead.
  if (fm.status === "Done") {
    console.error(
      `pickup: ${id} is Done — don't reopen. File a new ticket referencing this one.`
    );
    console.error(`See ${canonicalsDir}/definition-of-done.md section "Reverting Done".`);
    process.exit(1);
  }

  if (
    fm.status === "In progress" &&
    fm.owner &&
    fm.owner !== "unassigned" &&
    fm.owner !== owner
  ) {
    console.error(
      `pickup: ${id} is already In progress, owner "${fm.owner}". Refusing to take over.`
    );
    console.error("If they're done, ask them to flip status to Done; if collaborating, leave it.");
    process.exit(1);
  }

  let text = readFileSync(reqPath, "utf8");
  text = updateFrontmatterField(text, "status", "In progress");
  text = updateFrontmatterField(text, "owner", owner);
  text = updateFrontmatterField(text, "updated", todayISO());
  writeFileSync(reqPath, text);

  console.log(`pickup: ${id} (${dir}) → In progress, owner ${owner}, updated ${todayISO()}`);
  console.log("");
  console.log("Regenerating backlog...");
  execSync(`npm run ${regenScriptName()}`, { stdio: "inherit" });
  console.log("");
  console.log("Next:");
  console.log(`  git add ${reqPath}`);
  console.log(`  git commit -m 'chore(${id.toLowerCase()}): pick up'`);
}

main();
