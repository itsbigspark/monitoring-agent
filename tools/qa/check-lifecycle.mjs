#!/usr/bin/env node
// PR lifecycle gate and merge-time repair for spec tickets.
//
// Usage:
//   node tools/qa/check-lifecycle.mjs --pr
//   node tools/qa/check-lifecycle.mjs --complete-merged-pr
//
// Ticket ids are read from LIFECYCLE_TICKET_IDS or from the GitHub PR event
// title/body/branch. Use NO-TICKET in the PR title/body for genuine no-ticket
// work.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HARNESS_PATHS } from "./harness-paths.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const TEMPLATE_DIR = "_template";
const TICKET_ID_PATTERN = /\b[A-Z][A-Z0-9]*-\d{3,}\b/g;

function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    console.error(`lifecycle: missing ${CONFIG_FILE}`);
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  if (!config.workflow?.specsDir) {
    console.error("lifecycle: workflow.specsDir not configured in manifest");
    process.exit(1);
  }
  return {
    specsDir: config.workflow.specsDir,
    requirePrUrl: config.workflow.requirePrUrl !== false,
    completion: config.workflow.completion ?? "manual"
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function githubEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return null;
  return readJson(eventPath);
}

function parseFrontmatterBlock(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

function parseFrontmatter(text) {
  const block = parseFrontmatterBlock(text);
  if (!block) return null;
  const fm = {};
  for (const line of block.split("\n")) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  const pr = block.match(/^\s+pr:\s*(.*)$/m);
  fm.links_pr = pr ? pr[1].trim() : null;
  return fm;
}

function listSpecs(specsDir) {
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== TEMPLATE_DIR)
    .map((d) => {
      const reqPath = join(specsDir, d.name, "requirements.md");
      if (!existsSync(reqPath)) return null;
      const text = readFileSync(reqPath, "utf8");
      const fm = parseFrontmatter(text);
      if (!fm?.id) return null;
      return { dir: d.name, reqPath, text, fm };
    })
    .filter(Boolean);
}

function findSpecById(specsDir, id) {
  return listSpecs(specsDir).find((s) => s.fm.id === id) ?? null;
}

function prContext() {
  const event = githubEvent();
  const pr = event?.pull_request;
  return {
    event,
    pr,
    url: process.env.PR_URL || pr?.html_url || null,
    mergedAt: pr?.merged_at || null,
    isDraft: pr?.draft === true,
    isMerged: pr?.merged === true,
    text: [
      process.env.LIFECYCLE_PR_TEXT,
      pr?.title,
      pr?.body,
      pr?.head?.ref,
      process.env.GITHUB_HEAD_REF,
      process.env.GITHUB_REF_NAME
    ]
      .filter(Boolean)
      .join("\n")
  };
}

function hasNoTicketMarker(text) {
  return /\bNO-TICKET\b/i.test(text);
}

function ticketIdsFromContext(context) {
  if (process.env.LIFECYCLE_TICKET_IDS) {
    return process.env.LIFECYCLE_TICKET_IDS.split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [...new Set(context.text.match(TICKET_ID_PATTERN) ?? [])];
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

function updateFrontmatterField(text, field, value) {
  const fmMatch = text.match(/^(---\n[\s\S]*?\n---)/);
  if (!fmMatch) throw new Error("file has no YAML frontmatter");
  const fmBlock = fmMatch[1];
  const pattern = new RegExp(`^(${field}:\\s*).*$`, "m");
  if (!pattern.test(fmBlock)) throw new Error(`frontmatter has no field "${field}"`);
  const newFmBlock = fmBlock.replace(pattern, `$1${value}`);
  return text.replace(fmBlock, newFmBlock);
}

function updateLinksPr(text, value) {
  const fmMatch = text.match(/^(---\n[\s\S]*?\n---)/);
  if (!fmMatch) throw new Error("file has no YAML frontmatter");
  const fmBlock = fmMatch[1];
  const pattern = /^(\s+pr:\s*).*$/m;
  if (!pattern.test(fmBlock)) {
    throw new Error('frontmatter has no "links.pr" field - add it under links:');
  }
  const newFmBlock = fmBlock.replace(pattern, `$1${value}`);
  return text.replace(fmBlock, newFmBlock);
}

function todayISO(context) {
  const source = context.mergedAt || new Date().toISOString();
  return source.slice(0, 10);
}

function countUntickedTasks(specsDir, specDir) {
  const tasksPath = join(specsDir, specDir, "tasks.md");
  if (!existsSync(tasksPath)) return 0;
  const text = readFileSync(tasksPath, "utf8");
  return (text.match(/^\s*-\s*\[\s\]\s/gm) ?? []).length;
}

function checkPrLifecycle(config) {
  const context = prContext();
  if (context.isDraft) {
    console.log("lifecycle: PR is draft; skipping final ticket lifecycle check");
    return;
  }

  if (hasNoTicketMarker(context.text)) {
    console.log("lifecycle: NO-TICKET marker found; skipping ticket lifecycle check");
    return;
  }

  const ids = ticketIdsFromContext(context);
  if (ids.length === 0) {
    console.error(
      "lifecycle: no ticket id found in PR title, body, or branch. Add e.g. EXAMPLE-001 or NO-TICKET."
    );
    process.exit(1);
  }

  if (config.requirePrUrl && !isHttpUrl(context.url)) {
    console.error("lifecycle: PR URL unavailable; set PR_URL or run inside a pull_request workflow.");
    process.exit(1);
  }

  const errors = [];
  for (const id of ids) {
    const spec = findSpecById(config.specsDir, id);
    if (!spec) {
      errors.push(`${id}: no matching ${config.specsDir}/<id>/requirements.md found`);
      continue;
    }
    if (spec.fm.status !== "Done") {
      errors.push(
        `${id}: status is "${spec.fm.status ?? "unknown"}"; run ` +
          `npm run complete ${id} --pr ${context.url} as the final PR update`
      );
    }
    if (config.requirePrUrl && spec.fm.links_pr !== context.url) {
      errors.push(
        `${id}: links.pr is "${spec.fm.links_pr ?? "missing"}"; expected ${context.url}`
      );
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`lifecycle: PR ticket lifecycle passed (${ids.join(", ")})`);
}

function completeMergedPr(config) {
  const context = prContext();
  if (!context.isMerged) {
    console.log("lifecycle: PR was closed without merge; no ticket repair needed");
    return;
  }

  const ids = ticketIdsFromContext(context);
  if (ids.length === 0) {
    if (hasNoTicketMarker(context.text)) {
      console.log("lifecycle: merged PR has NO-TICKET marker; no ticket repair needed");
      return;
    }
    console.log("lifecycle: merged PR has no ticket id; no ticket repair possible");
    return;
  }

  if (!isHttpUrl(context.url)) {
    console.error("lifecycle: PR URL unavailable; cannot complete merged tickets.");
    process.exit(1);
  }

  const errors = [];
  const completed = [];
  for (const id of ids) {
    const spec = findSpecById(config.specsDir, id);
    if (!spec) {
      errors.push(`${id}: no matching ${config.specsDir}/<id>/requirements.md found`);
      continue;
    }

    const unticked = countUntickedTasks(config.specsDir, spec.dir);
    if (unticked > 0) {
      errors.push(
        `${id}: ${unticked} unticked tasks remain; refusing merge-time auto-completion`
      );
      continue;
    }

    if (spec.fm.status === "Done" && spec.fm.links_pr === context.url) continue;
    if (spec.fm.status === "Done" && spec.fm.links_pr && spec.fm.links_pr !== context.url) {
      errors.push(
        `${id}: already Done with links.pr ${spec.fm.links_pr}; refusing to overwrite with ${context.url}`
      );
      continue;
    }

    let text = spec.text;
    text = updateFrontmatterField(text, "status", "Done");
    if (!spec.fm.owner || spec.fm.owner === "unassigned") {
      text = updateFrontmatterField(text, "owner", context.pr?.user?.login || "github-actions[bot]");
    }
    text = updateFrontmatterField(text, "updated", todayISO(context));
    text = updateLinksPr(text, context.url);
    writeFileSync(spec.reqPath, text);
    completed.push(id);
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  if (completed.length === 0) {
    console.log("lifecycle: merged PR tickets already complete; no docs changes needed");
    return;
  }

  execSync("node tools/qa/generate-backlog.mjs", { stdio: "inherit" });
  if (existsSync("tools/qa/sync-kiro-specs.mjs")) {
    execSync("node tools/qa/sync-kiro-specs.mjs", { stdio: "inherit" });
  }
  if (existsSync("tools/qa/check-tasks-done.mjs")) {
    execSync("node tools/qa/check-tasks-done.mjs", { stdio: "inherit" });
  }
  console.log(`lifecycle: completed merged ticket(s): ${completed.join(", ")}`);
}

function main() {
  const config = readConfig();
  if (process.argv.includes("--pr")) {
    checkPrLifecycle(config);
    return;
  }
  if (process.argv.includes("--complete-merged-pr")) {
    completeMergedPr(config);
    return;
  }
  console.error("usage: node tools/qa/check-lifecycle.mjs --pr|--complete-merged-pr");
  process.exit(1);
}

main();
