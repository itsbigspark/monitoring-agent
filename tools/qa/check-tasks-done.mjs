#!/usr/bin/env node
// For each spec with frontmatter status: Done, enforce the mechanical parts
// of the Definition of Done: links.pr must be an http(s) URL and tasks.md
// must not contain unticked checkboxes.
//
// Usage:
//   node tools/qa/check-tasks-done.mjs
//
// Exits non-zero if any Done spec is missing links.pr or has unticked tasks.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HARNESS_PATHS } from "./harness-paths.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const TEMPLATE_DIR = "_template";

function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    console.error(`tasks:check: missing ${CONFIG_FILE}`);
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  if (!config.workflow?.specsDir) {
    console.log("tasks check skipped (workflow.specsDir not configured)");
    process.exit(0);
  }
  return { specsDir: config.workflow.specsDir };
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

function frontmatterBlock(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}

function linksPr(text) {
  const m = frontmatterBlock(text).match(/^\s+pr:\s*(.*)$/m);
  return m ? m[1].trim() : null;
}

function isHttpUrl(value) {
  if (!value || value === "null") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function countUntickedCheckboxes(text) {
  const matches = text.match(/^\s*-\s*\[\s\]\s/gm);
  return matches ? matches.length : 0;
}

function main() {
  const { specsDir } = readConfig();
  if (!existsSync(specsDir)) {
    console.log("tasks check passed (no specs)");
    return;
  }

  const errors = [];
  let checkedCount = 0;
  const dirs = readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== TEMPLATE_DIR)
    .map((d) => d.name);

  for (const dir of dirs) {
    const reqPath = join(specsDir, dir, "requirements.md");
    if (!existsSync(reqPath)) continue;
    const reqText = readFileSync(reqPath, "utf8");
    const fm = parseFrontmatter(reqText);
    if (fm?.status !== "Done") continue;
    checkedCount++;
    const pr = linksPr(reqText);
    if (!isHttpUrl(pr)) {
      errors.push(
        `${reqPath}: ${fm.id} status is Done but links.pr is not an http(s) URL. ` +
          `Run 'npm run complete ${fm.id} --pr <url>' to repair it.`
      );
    }
    const tasksPath = join(specsDir, dir, "tasks.md");
    if (!existsSync(tasksPath)) continue;
    const unticked = countUntickedCheckboxes(readFileSync(tasksPath, "utf8"));
    if (unticked > 0) {
      errors.push(
        `${tasksPath}: ${unticked} unticked checkbox(es) but ${fm.id} status is Done. ` +
          `Either tick them (work was completed), delete them (out of scope; note in PR), ` +
          `or revert status with 'npm run pickup ${fm.id}'.`
      );
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log(
    `tasks check passed (${checkedCount} Done spec${checkedCount === 1 ? "" : "s"} verified)`
  );
}

main();
