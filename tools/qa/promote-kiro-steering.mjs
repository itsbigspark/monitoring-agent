#!/usr/bin/env node
// Promote Kiro-native steering content to canonical at canonicalsDir, then
// restore the steering file as a thin Kiro adapter. Mirror of kiro:promote
// for specs, applied to .kiro/steering/<file>.md files.
//
// Background: Kiro's UX writes content to .kiro/steering/<file>.md directly.
// Per the canonical-paths rule, convention canonicals live at <canonicalsDir>/
// and .kiro/steering/<file>.md is a thin #[[file:...]] adapter. When dev (or
// any contributor editing in Kiro) modifies steering with full content, this
// command restores the canonical pattern: extract content to <canonicalsDir>/,
// restore adapter.
//
// Usage:
//   npm run kiro:promote-steering <name>           # promote one (e.g. product.md)
//   npm run kiro:promote-steering -- --all         # promote all non-adapter steering files
//   npm run kiro:promote-steering <name> --force   # also promote when canonical exists (overwrites)
//   npm run kiro:promote-steering -- --all --force # overwrite all canonicals
//
// Refuses if:
//   - file is already a thin adapter (no content to promote — no-op)
//   - file isn't in the registered steering map (must be added to manifest first)
//   - canonical at root would be overwritten and --force not provided

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { HARNESS_PATHS, canonicalPath, resolveKiroSteering } from "./harness-paths.mjs";
import {
  classifySteeringFile,
  personalSteeringSuggestion
} from "./harness-steering-personal.mjs";

const STEERING_DIR = HARNESS_PATHS.adapters.kiroSteering;
const CONFIG_FILE = HARNESS_PATHS.config;

function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    console.error(`promote-steering: missing ${CONFIG_FILE}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
}

function buildAdapterMap(config) {
  // Project the manifest's active steering keys into a per-file table the
  // promote logic uses: { steeringFile: { canonical, ref, inclusion, fileMatchPattern, title } }.
  const map = {};
  for (const [key, value] of Object.entries(config.kiro?.steering ?? {})) {
    const steering = resolveKiroSteering(config, key, value);
    const canonical = canonicalPath(config, steering.canonicalFile);
    const ref = config.kiro?.referenceStyle === "relative"
      ? relative(dirname(steering.file), canonical).replace(/\\/g, "/")
      : canonical;
    map[basename(steering.file)] = {
      canonical,
      ref,
      inclusion: steering.mode,
      fileMatchPattern: steering.fileMatchPattern,
      title: steering.title
    };
  }
  return map;
}

function isAdapter(text) {
  return /#\[\[file:[^\]]+\.md\]\]/.test(text);
}

function extractBody(text) {
  if (text.startsWith("---")) {
    const m = text.match(/^---\n[\s\S]*?\n---\n/);
    if (m) text = text.slice(m[0].length);
  }
  return text.replace(/^\n+/, "").replace(/\s+$/, "") + "\n";
}

function buildAdapter({ canonical, ref, inclusion, fileMatchPattern, title }) {
  const fmLines = [`inclusion: ${inclusion}`];
  if (Array.isArray(fileMatchPattern)) fmLines.push(`fileMatchPattern: ${JSON.stringify(fileMatchPattern)}`);
  return [
    "---",
    ...fmLines,
    "---",
    "",
    `# ${title}`,
    "",
    "Primary context:",
    "",
    `- #[[file:${ref}]]`,
    "",
    `Canonical content lives at \`${canonical}\`. This file is a thin Kiro adapter — do not duplicate content here. Update \`${canonical}\` instead.`,
    ""
  ].join("\n");
}

function promoteOne(adapterMap, steeringName, force) {
  const adapter = adapterMap[steeringName];
  if (!adapter) {
    // Before falling through to the legacy "not registered" hard-fail, give
    // the personal classifier a chance to redirect the contributor to the
    // right home (HARNESS-PERSONAL-PREFERENCES). Warn-and-exit-zero matches
    // the --all path so single-file callers see the same outcome.
    const path = `${STEERING_DIR}/${steeringName}`;
    if (existsSync(path)) {
      const text = readFileSync(path, "utf8");
      const verdict = classifySteeringFile({
        filename: steeringName,
        content: text,
        registeredFilenames: new Set(Object.keys(adapterMap))
      });
      if (verdict.kind === "personal") {
        console.warn(`promote-steering: ${path} ${personalSteeringSuggestion(steeringName)}`);
        return false;
      }
    }
    console.error(
      `promote-steering: "${steeringName}" not registered in manifest kiro.steering.`
    );
    console.error(
      "Available (manifest-active): " + (Object.keys(adapterMap).join(", ") || "(none)")
    );
    console.error(
      "If you're adding a new convention doc, declare it in agent-harness.config.json kiro.steering first, then add the canonical to canonicals."
    );
    process.exit(1);
  }
  const steeringPath = `${STEERING_DIR}/${steeringName}`;
  if (!existsSync(steeringPath)) {
    console.error(`promote-steering: ${steeringPath} does not exist`);
    process.exit(1);
  }
  const text = readFileSync(steeringPath, "utf8");
  if (isAdapter(text)) {
    console.log(`promote-steering: ${steeringPath} is already a thin adapter. No-op.`);
    return false;
  }
  const body = extractBody(text);
  if (body.trim().length === 0) {
    console.error(
      `promote-steering: ${steeringPath} is empty (Kiro placeholder?). Generate content first or delete the placeholder.`
    );
    process.exit(1);
  }
  const canonicalPath = adapter.canonical;
  const wasOverwrite = existsSync(canonicalPath);
  if (wasOverwrite && !force) {
    console.error(
      `promote-steering: refusing to overwrite ${canonicalPath}. Re-run with --force to replace.`
    );
    process.exit(1);
  }
  writeFileSync(canonicalPath, body);
  writeFileSync(steeringPath, buildAdapter(adapter));
  console.log(
    `promote-steering: ${steeringPath} → ${canonicalPath}${wasOverwrite ? " (replaced)" : ""} (${body.length} bytes); restored thin adapter.`
  );
  return true;
}

// Second pass: scan ACTUAL files in .kiro/steering/ (in addition to the
// adapterMap-driven first pass below) and emit a warning for any file that
// classifies as personal-shaped (HARNESS-PERSONAL-PREFERENCES). This runs
// before the promote loop so contributors see the suggestion even when their
// personal file would otherwise be silently skipped by the `!(file in
// adapterMap)` filter. Personal files are NEVER promoted — they aren't
// canonical content.
//
// Returns the set of filenames that were warned, so the promote loop can
// distinguish "skipped because personal" from "skipped because not in
// adapter map" if it ever wants to.
function warnPersonalShaped(adapterMap) {
  const warned = new Set();
  if (!existsSync(STEERING_DIR)) return warned;
  const registered = new Set(Object.keys(adapterMap));
  for (const file of readdirSync(STEERING_DIR)) {
    if (!file.endsWith(".md")) continue;
    const path = `${STEERING_DIR}/${file}`;
    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    const result = classifySteeringFile({
      filename: file,
      content: text,
      registeredFilenames: registered
    });
    if (result.kind !== "personal") continue;
    warned.add(file);
    console.warn(`promote-steering: ${path} ${personalSteeringSuggestion(file)}`);
  }
  return warned;
}

function promoteAll(adapterMap, force) {
  if (!existsSync(STEERING_DIR)) {
    // Pre-commit may run this in a repo without .kiro/steering yet; that's a no-op, not an error.
    console.log("promote-steering: no .kiro/steering directory; nothing to do.");
    return;
  }
  // Surface personal-shaped files first so the warning isn't drowned by the
  // promote summary that follows. Warn-not-fail per the ticket: pre-commit
  // would block legitimate work otherwise.
  warnPersonalShaped(adapterMap);
  const promoted = [];
  const skipped = [];
  for (const file of readdirSync(STEERING_DIR)) {
    if (!file.endsWith(".md")) continue;
    if (!(file in adapterMap)) continue;
    const text = readFileSync(`${STEERING_DIR}/${file}`, "utf8");
    if (isAdapter(text)) {
      skipped.push(file);
      continue;
    }
    promoteOne(adapterMap, file, force);
    promoted.push(file);
  }
  if (promoted.length === 0) {
    console.log("promote-steering: all registered steering files are already thin adapters. Nothing to do.");
  } else {
    console.log(`\npromote-steering: promoted ${promoted.length} file(s); ${skipped.length} already-adapter skipped.`);
  }
}

function main() {
  const config = readConfig();
  const adapterMap = buildAdapterMap(config);
  const allFlag = process.argv.includes("--all");
  const force = process.argv.includes("--force");
  if (allFlag) {
    promoteAll(adapterMap, force);
    return;
  }
  const name = process.argv[2];
  if (!name || name.startsWith("--")) {
    console.error("usage: npm run kiro:promote-steering <name> [-- --force]  OR  npm run kiro:promote-steering -- --all [--force]");
    console.error("");
    console.error("Available steering files (manifest-active):");
    for (const k of Object.keys(adapterMap)) console.error(`  ${k}`);
    process.exit(1);
  }
  promoteOne(adapterMap, name, force);
}

main();
