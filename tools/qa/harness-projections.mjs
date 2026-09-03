// Skill projection chain shared between the kit binary
// (`agent-harness generate` / `agent-harness check --kit`) and the
// consumer-shipped `harness:check` script.
//
// All projection paths are returned as cwd-relative strings; both call sites
// run from the consumer repo root, so callers may pass the returned paths
// straight to existsSync / readFileSync.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import {
  ADAPTER_PATHS,
  HARNESS_PATHS,
  canonicalPath,
  isPowerFilePath,
  isRootCanonical,
  isSkillFilePath,
  normalizeCanonicalsDir
} from "./harness-paths.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const PROFILE_MANIFEST_FILE = HARNESS_PATHS.profileManifest;

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function toBuffer(content) {
  return Buffer.isBuffer(content) ? content : Buffer.from(content);
}

// Recursive file listing under `root`. Returns absolute-or-relative paths
// matching whatever was passed in. Sorted for deterministic projection order.
// Distinct from `lib.mjs#listFiles`, which filters ignored dirs for the
// repo-wide format gate; this variant includes everything under the skill
// directory because skill canonicals are intentional.
export function listFiles(root) {
  const results = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(path));
    } else if (entry.isFile()) {
      results.push(path);
    }
  }
  return results.sort();
}

// Throws if the skill manifest entry doesn't point at a SKILL.md. The
// pre-extraction kit copy called `fail([...])` (process.exit); the consumer
// copy threw `new Error(...)`. We canonicalise on the throw form per ticket
// guidance — the call site decides whether to halt or aggregate. The kit's
// `generateSkillAdapters` wraps the call in fail() to preserve its exit
// semantics; the consumer's `skillErrors` lets the throw propagate, matching
// its prior crash-with-stack behaviour.
export function validateSkillPathShape(skill) {
  if (typeof skill.path !== "string" || !isSkillFilePath(skill.path)) {
    throw new Error(`${CONFIG_FILE}: skills.${skill.name}.path must point to a SKILL.md file`);
  }
}

export function skillCanonicalFiles(skill) {
  validateSkillPathShape(skill);
  const root = dirname(skill.path);
  return listFiles(root).map((path) => ({
    path,
    relativePath: relative(root, path).replace(/\\/g, "/"),
    canonicalRelativePath: relative(process.cwd(), path).replace(/\\/g, "/"),
    content: readFileSync(path)
  }));
}

export function skillDirectoryOutputs(targetRoot, skillFiles) {
  return skillFiles.map((file) => ({
    path: `${targetRoot}/${file.relativePath}`,
    canonicalPath: file.canonicalRelativePath,
    content: file.content
  }));
}

// Returns the set of projected skill outputs for `skill` under `config`.
// Lazy form: the cursor branch reads canonicalText itself from skill.path.
// Output shape is normalised to `{ path, content }` (matching the directory
// outputs); the pre-extraction kit copy emitted `{ path, text }` for the
// cursor branch, which call sites already coerced via `output.content ??
// output.text`. We drop the legacy `text` key here.
export function skillAdapterOutputs(config, skill) {
  const outputs = [];
  const adapters = config.adapters ?? [];
  const skillFiles = skillCanonicalFiles(skill);
  for (const [adapter, root] of Object.entries(ADAPTER_PATHS.skillDirectories)) {
    if (adapters.includes(adapter)) {
      outputs.push(...skillDirectoryOutputs(`${root}/${skill.name}`, skillFiles));
    }
  }
  if (adapters.includes("cursor")) {
    const canonicalText = readFileSync(skill.path, "utf8");
    outputs.push({
      path: `${ADAPTER_PATHS.cursorRules}/${skill.name}.mdc`,
      content: renderCursorSkillRule(skill, canonicalText)
    });
  }
  return outputs;
}

export function skillMetadata(skill, canonicalText) {
  const metadata = { name: skill.name, description: `Use the ${skill.name} skill.` };
  const match = canonicalText.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return metadata;
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    const key = field[1];
    let value = field[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === "name" && value) metadata.name = value;
    if (key === "description" && value) metadata.description = value;
  }
  return metadata;
}

export function renderCursorSkillRule(skill, canonicalText) {
  const metadata = skillMetadata(skill, canonicalText);
  return `---
description: ${JSON.stringify(metadata.description)}
alwaysApply: false
---

Apply the skill in \`${skill.path}\`.
`;
}

// Reads the generated profile manifest and returns the union of all declared
// output paths. Returns an empty Set if the manifest is missing or malformed
// (manifest issues are surfaced separately by profileErrors).
export function profileOutputPaths() {
  const paths = new Set();
  if (!existsSync(PROFILE_MANIFEST_FILE)) return paths;
  try {
    const manifest = readJson(PROFILE_MANIFEST_FILE);
    for (const profile of manifest.profiles ?? []) {
      for (const path of Object.values(profile.outputs ?? {})) {
        paths.add(path);
      }
    }
  } catch {
    // profileErrors reports malformed profile manifests separately.
  }
  return paths;
}

// Validates that each declared skill canonical exists, has frontmatter, and
// projects to outputs that match on disk byte-for-byte. Errors are returned
// as strings so the caller can aggregate.
export function skillErrors(config) {
  const errors = [];
  const profileOutputs = profileOutputPaths();
  for (const skill of config.skills ?? []) {
    if (!existsSync(skill.path)) {
      errors.push(`missing skill canonical: ${skill.path}`);
      continue;
    }
    const canonicalText = readFileSync(skill.path, "utf8");
    if (!canonicalText.startsWith("---\n")) {
      errors.push(`${skill.path}: missing skill frontmatter`);
    }
    for (const output of skillAdapterOutputs(config, skill)) {
      if (profileOutputs.has(output.path)) {
        errors.push(`${output.path}: declared skill projection collides with a generated profile output`);
      }
      if (!existsSync(output.path)) {
        errors.push(`missing skill adapter: ${output.path}`);
        continue;
      }
      const expectedBuffer = toBuffer(output.content ?? output.text);
      const actualBuffer = readFileSync(output.path);
      const expectedHash = createHash("sha256").update(expectedBuffer).digest("hex");
      const actualHash = createHash("sha256").update(actualBuffer).digest("hex");
      if (expectedHash !== actualHash) {
        const canonicalReference = output.canonicalPath ?? skill.path;
        errors.push(
          `skill projection drift: ${output.path} differs from ${canonicalReference}; ` +
            `run 'agent-harness generate' to refresh, or 'generate --sync' if the projection ` +
            `edit is intentional and the canonical should not be re-overwritten.`
        );
      }
    }
  }
  return errors;
}

// ---------- power projection chain ----------
//
// Mirrors the skill projection chain but is constrained by
// ADAPTER_PATHS.powerDirectories (Kiro-only per AM-020). The shape is
// deliberately parallel to the skill helpers so reviewers can read both
// chains side-by-side: validatePowerPathShape -> powerCanonicalFiles ->
// powerDirectoryOutputs -> powerAdapterOutputs -> powerErrors.

// Throws when the power manifest entry doesn't point at a POWER.md. Mirrors
// validateSkillPathShape: callers decide whether to halt (kit's
// generatePowerAdapters wraps in fail()) or aggregate (powerErrors lets the
// throw propagate to match skillErrors's contract).
export function validatePowerPathShape(power) {
  if (typeof power.path !== "string" || !isPowerFilePath(power.path)) {
    throw new Error(`${CONFIG_FILE}: powers.${power.name}.path must point to a POWER.md file`);
  }
}

export function powerCanonicalFiles(power) {
  validatePowerPathShape(power);
  const root = dirname(power.path);
  return listFiles(root).map((path) => ({
    path,
    relativePath: relative(root, path).replace(/\\/g, "/"),
    canonicalRelativePath: relative(process.cwd(), path).replace(/\\/g, "/"),
    content: readFileSync(path)
  }));
}

export function powerDirectoryOutputs(targetRoot, powerFiles) {
  return powerFiles.map((file) => ({
    path: `${targetRoot}/${file.relativePath}`,
    canonicalPath: file.canonicalRelativePath,
    content: file.content
  }));
}

// Returns the projected outputs for `power` under `config`. Power is a
// Kiro-specific primitive: when adapters[] does not include 'kiro' the
// returned list is empty (silent — the asset-manager warns at install time
// per AM-020's unsupported_warn posture for non-Kiro adapters).
export function powerAdapterOutputs(config, power) {
  const outputs = [];
  const adapters = config.adapters ?? [];
  const powerFiles = powerCanonicalFiles(power);
  for (const [adapter, root] of Object.entries(ADAPTER_PATHS.powerDirectories)) {
    if (adapters.includes(adapter)) {
      outputs.push(...powerDirectoryOutputs(`${root}/${power.name}`, powerFiles));
    }
  }
  return outputs;
}

// Validates declared power canonicals exist, have frontmatter, and that each
// projected output matches the canonical byte-for-byte. Errors are returned
// as strings so the caller can aggregate (mirrors skillErrors).
export function powerErrors(config) {
  const errors = [];
  const profileOutputs = profileOutputPaths();
  for (const power of config.powers ?? []) {
    if (!existsSync(power.path)) {
      errors.push(`missing power canonical: ${power.path}`);
      continue;
    }
    const canonicalText = readFileSync(power.path, "utf8");
    if (!canonicalText.startsWith("---\n")) {
      errors.push(`${power.path}: missing power frontmatter`);
    }
    for (const output of powerAdapterOutputs(config, power)) {
      if (profileOutputs.has(output.path)) {
        errors.push(`${output.path}: declared power projection collides with a generated profile output`);
      }
      if (!existsSync(output.path)) {
        errors.push(`missing power adapter: ${output.path}`);
        continue;
      }
      const expectedBuffer = toBuffer(output.content ?? output.text);
      const actualBuffer = readFileSync(output.path);
      const expectedHash = createHash("sha256").update(expectedBuffer).digest("hex");
      const actualHash = createHash("sha256").update(actualBuffer).digest("hex");
      if (expectedHash !== actualHash) {
        const canonicalReference = output.canonicalPath ?? power.path;
        errors.push(
          `power projection drift: ${output.path} differs from ${canonicalReference}; ` +
            `run 'agent-harness generate' to refresh, or 'generate --sync' if the projection ` +
            `edit is intentional and the canonical should not be re-overwritten.`
        );
      }
    }
  }
  return errors;
}

// Render the bullet list that lives between the KIT-CANONICALS markers in
// AGENTS.md. Filters config.canonicals[] to entries that resolve under
// canonicalsDir (skips AGENTS.md / CLAUDE.md / anything at root).
export function renderCanonicalsBlock(config) {
  const lines = [];
  for (const canonical of config.canonicals ?? []) {
    if (isRootCanonical(canonical)) continue;
    const path = canonicalPath(config, canonical);
    if (!path.startsWith(`${normalizeCanonicalsDir(config.canonicalsDir)}/`)) continue;
    lines.push(`- \`${path}\``);
  }
  return lines.join("\n");
}
