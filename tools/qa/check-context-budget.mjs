#!/usr/bin/env node
//
// check-context-budget.mjs — quality gate for always-loaded canonical context
// size. Parses a Budget_Table out of the canonical harness doc, then enforces
// per-file and per-tool cumulative line budgets against files on disk.
//
// Exit codes:
//   0  — no violations OR only soft warnings
//   1  — at least one hard violation (≥20% over), missing file, missing
//        per-file budget entry, or unparseable table.
//
// CLI:
//   check-context-budget.mjs [--base-dir <dir>] [--doc <path>]
//
// Programmatic:
//   import { runBudgetCheck, parseBudgetTable } from "./check-context-budget.mjs";
//   const { exitCode, errors, warnings, summary } =
//     runBudgetCheck({ tableDoc, baseDir });

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOFT_THRESHOLD = 0;       // 0% over budget triggers warning
const HARD_THRESHOLD = 20;      // ≥20% over budget triggers error

// ---------------------------------------------------------------------------
// Budget_Table parsing
// ---------------------------------------------------------------------------
//
// Expected Markdown shape (anchored on the `## Context budget` heading):
//
//   ## Context budget
//   ...optional prose...
//   ### Per-file budgets
//   | File | Budget (lines) |
//   |---|---|
//   | AGENTS.md | 200 |
//   | CLAUDE.md | 150 |
//
//   ### Per-tool cumulative budgets
//   | Tool | Cumulative budget (lines) | Always-loaded files |
//   |---|---|---|
//   | claude-code | 800 | AGENTS.md, CLAUDE.md |
//
// The parser is intentionally regex-based — no Markdown-library dependency.
// Returns:
//   { perFile: Map<string, number>, perTool: Array<{tool, budget, files: string[]}> }

export function parseBudgetTable(tableDoc) {
  if (typeof tableDoc !== "string" || tableDoc.length === 0) {
    throw new BudgetParseError("Budget_Table source doc is empty.");
  }

  // Heading may be "## Context budget" or "## 5.1 Context budget" — allow an
  // optional dotted-number prefix.
  const sectionMatch = tableDoc.match(
    /^##\s+(?:[\d.]+\s+)?Context budget\s*$([\s\S]*?)(?=\n##\s+|$(?![\r\n]))/m
  );
  if (!sectionMatch) {
    throw new BudgetParseError(
      "Budget_Table parse failure: could not find '## Context budget' section."
    );
  }
  const section = sectionMatch[1];

  const perFile = parsePerFileTable(section);
  const perTool = parsePerToolTable(section);

  if (perFile.size === 0 && perTool.length === 0) {
    throw new BudgetParseError(
      "Budget_Table parse failure: no per-file or per-tool budget rows found."
    );
  }

  return { perFile, perTool };
}

function parsePerFileTable(section) {
  const subsection = extractSubsection(section, "Per-file budgets");
  const rows = extractTableRows(subsection);
  const map = new Map();
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const file = cells[0];
    const budget = parseInteger(cells[1]);
    if (!file || budget === null) continue;
    map.set(file, budget);
  }
  return map;
}

function parsePerToolTable(section) {
  const subsection = extractSubsection(section, "Per-tool cumulative budgets");
  const rows = extractTableRows(subsection);
  const out = [];
  for (const cells of rows) {
    if (cells.length < 3) continue;
    const tool = cells[0];
    const budget = parseInteger(cells[1]);
    const files = cells[2]
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    if (!tool || budget === null || files.length === 0) continue;
    out.push({ tool, budget, files });
  }
  return out;
}

function extractSubsection(section, heading) {
  // Match `### <heading>` then capture until the next `### ` or end-of-section.
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^###\\s+${escaped}\\s*$([\\s\\S]*?)(?=\\n###\\s+|\\n##\\s+|$(?![\\r\\n]))`, "m");
  const match = section.match(re);
  return match ? match[1] : "";
}

function extractTableRows(text) {
  const lines = text.split("\n");
  const rows = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    // Skip the header row (cells like "File"/"Budget (lines)") and the
    // separator (cells of dashes / colons).
    const cells = splitTableRow(line);
    if (cells.length === 0) continue;
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // separator row
    if (cells[0].toLowerCase() === "file" && /budget/i.test(cells[1] || "")) continue;
    if (cells[0].toLowerCase() === "tool") continue;
    rows.push(cells);
  }
  return rows;
}

function splitTableRow(line) {
  // Strip leading and trailing pipes, split on remaining pipes, trim cells.
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function parseInteger(text) {
  const m = String(text || "").match(/-?\d+/);
  if (!m) return null;
  return Number.parseInt(m[0], 10);
}

class BudgetParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "BudgetParseError";
  }
}

// ---------------------------------------------------------------------------
// Line counting (mirrors `wc -l`: count newline characters).
// ---------------------------------------------------------------------------

export function countLines(content) {
  if (!content) return 0;
  const matches = content.match(/\n/g);
  return matches ? matches.length : 0;
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

export function runBudgetCheck({ tableDoc, baseDir }) {
  const errors = [];
  const warnings = [];
  let parsed;

  try {
    parsed = parseBudgetTable(tableDoc);
  } catch (error) {
    if (error instanceof BudgetParseError) {
      errors.push(`ERROR: ${error.message}`);
      return { exitCode: 1, errors, warnings, summary: "context budget gate: parse failure" };
    }
    throw error;
  }

  const { perFile, perTool } = parsed;
  const lineCounts = new Map(); // file -> Line_Count

  // 1. Per-file budget enforcement.
  for (const [file, budget] of perFile) {
    const abs = resolve(baseDir, file);
    if (!existsSync(abs)) {
      errors.push(`ERROR: ${file}: missing on disk (referenced by Budget_Table per-file section).`);
      continue;
    }
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch (error) {
      errors.push(`ERROR: ${file}: could not read file (${error.message}).`);
      continue;
    }
    const lines = countLines(content);
    lineCounts.set(file, lines);

    const verdict = classify(lines, budget);
    if (verdict.kind === "hard") {
      errors.push(
        `ERROR: ${file}: ${lines} lines exceeds budget ${budget} by ${verdict.percentOver}% (hard threshold ${HARD_THRESHOLD}%).`
      );
    } else if (verdict.kind === "soft") {
      warnings.push(
        `WARN: ${file}: ${lines} lines exceeds budget ${budget} by ${verdict.percentOver}% (soft threshold ${SOFT_THRESHOLD}%).`
      );
    }
  }

  // 2. Per-tool cumulative enforcement + missing-budget-entry guard
  //    (Requirement 1.4).
  for (const profile of perTool) {
    let cumulative = 0;
    let profileSkipped = false;

    for (const file of profile.files) {
      if (!perFile.has(file)) {
        errors.push(
          `ERROR: ${file}: referenced by tool '${profile.tool}' but has no per-file budget entry in Budget_Table.`
        );
        profileSkipped = true;
        continue;
      }
      let lines = lineCounts.get(file);
      if (lines === undefined) {
        // The per-file pass marked this missing or unreadable; skip cumulative.
        profileSkipped = true;
        continue;
      }
      cumulative += lines;
    }

    if (profileSkipped) {
      // We still want to surface cumulative status when possible, but if any
      // referenced file is missing or unbudgeted, the cumulative number is
      // not meaningful — skip it to avoid noisy double-reporting.
      continue;
    }

    const verdict = classify(cumulative, profile.budget);
    if (verdict.kind === "hard") {
      errors.push(
        `ERROR: tool '${profile.tool}': cumulative ${cumulative} lines exceeds budget ${profile.budget} by ${verdict.percentOver}% (hard threshold ${HARD_THRESHOLD}%).`
      );
    } else if (verdict.kind === "soft") {
      warnings.push(
        `WARN: tool '${profile.tool}': cumulative ${cumulative} lines exceeds budget ${profile.budget} by ${verdict.percentOver}% (soft threshold ${SOFT_THRESHOLD}%).`
      );
    }
  }

  const exitCode = errors.length > 0 ? 1 : 0;
  const summary = buildSummary({
    fileCount: perFile.size,
    toolCount: perTool.length,
    warningCount: warnings.length,
    errorCount: errors.length,
    exitCode
  });

  return { exitCode, errors, warnings, summary };
}

function classify(actual, budget) {
  if (budget <= 0) return { kind: "hard", percentOver: Number.POSITIVE_INFINITY };
  if (actual <= budget) return { kind: "ok", percentOver: 0 };
  const percentOver = Math.round(((actual - budget) / budget) * 100);
  if (percentOver >= HARD_THRESHOLD) return { kind: "hard", percentOver };
  return { kind: "soft", percentOver };
}

function buildSummary({ fileCount, toolCount, warningCount, errorCount, exitCode }) {
  if (exitCode === 0 && warningCount === 0) {
    return `context budget gate: ${fileCount} files / ${toolCount} tools — pass.`;
  }
  if (exitCode === 0) {
    return `context budget gate: ${fileCount} files / ${toolCount} tools — pass with ${warningCount} warning(s).`;
  }
  return `context budget gate: ${fileCount} files / ${toolCount} tools — FAIL with ${errorCount} error(s) and ${warningCount} warning(s).`;
}

// ---------------------------------------------------------------------------
// CLI wrapper
// ---------------------------------------------------------------------------

const DEFAULT_DOC_PATH = "docs/ai/agentic-coding-harness.md";

function parseArgs(argv) {
  const args = { baseDir: process.cwd(), doc: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-dir") {
      args.baseDir = resolve(argv[++i] || process.cwd());
    } else if (a === "--doc") {
      args.doc = resolve(argv[++i]);
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (!a.startsWith("--") && i === 0) {
      // Positional first arg = base dir, for ergonomic CLI use.
      args.baseDir = resolve(a);
    }
  }
  if (!args.doc) {
    args.doc = join(args.baseDir, DEFAULT_DOC_PATH);
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      "check-context-budget.mjs — enforce per-file and per-tool context budgets.",
      "",
      "Usage:",
      "  check-context-budget.mjs [--base-dir <dir>] [--doc <path>]",
      "",
      "Options:",
      `  --base-dir <dir>  Directory to resolve files against (default: cwd).`,
      `  --doc <path>      Path to the canonical doc containing the Budget_Table`,
      `                    (default: <base-dir>/${DEFAULT_DOC_PATH}).`,
      ""
    ].join("\n")
  );
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }

  if (!existsSync(args.doc)) {
    process.stderr.write(
      `ERROR: Budget_Table doc not found at ${args.doc}.\n`
    );
    return 1;
  }
  const tableDoc = readFileSync(args.doc, "utf8");

  const result = runBudgetCheck({ tableDoc, baseDir: args.baseDir });

  for (const w of result.warnings) {
    process.stderr.write(`${w}\n`);
  }
  for (const e of result.errors) {
    process.stderr.write(`${e}\n`);
  }
  process.stdout.write(`${result.summary}\n`);
  return result.exitCode;
}

// Run as a script when invoked directly.
const isCli = (() => {
  try {
    return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isCli) {
  process.exit(main(process.argv.slice(2)));
}
