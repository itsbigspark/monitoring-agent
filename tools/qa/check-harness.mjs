#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ADAPTERS,
  GATE_SCRIPTS
} from "./harness-contract.mjs";
import { fail, loadAndRunPlugins } from "./lib.mjs";
import {
  ADAPTER_PATHS,
  HARNESS_PATHS,
  SKILL_ENTRY_FILE,
  canonicalPath,
  normalizeCanonicalsDir,
  resolveKiroSteering
} from "./harness-paths.mjs";
import { kiroSpecFilePaths, workflowFilePaths } from "./harness-workflow.mjs";
import {
  agentsMdCanonicalsErrors,
  kiroReferenceErrors,
  kiroSteeringErrors,
  materializedProjectionConfig,
  normalizeSkills,
  personalAdapterProjectionRoot,
  profileErrors,
  validateConfig
} from "./harness-validate.mjs";
import {
  classifySteeringFile,
  personalSteeringSuggestion
} from "./harness-steering-personal.mjs";
import {
  powerErrors,
  readJson,
  skillErrors
} from "./harness-projections.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const PROFILE_MANIFEST_FILE = HARNESS_PATHS.profileManifest;

// --asset <name> filters drift detection to a single named skill/power asset.
// When set, only that asset's projections are validated; other repo-wide
// drift is ignored. Whole-repo behaviour (no flag) is preserved exactly.
// HARNESS-CHECK-PER-ASSET — see kit README "Versioning and capabilities".
function parseAssetFlag(argv) {
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--asset") return args[i + 1] ?? null;
    if (args[i].startsWith("--asset=")) return args[i].slice("--asset=".length);
  }
  return null;
}

const assetFilter = parseAssetFlag(process.argv);

const adapterFiles = {
  codex: [`${ADAPTER_PATHS.skillDirectories.codex}/agent-harness/${SKILL_ENTRY_FILE}`],
  claude: ["CLAUDE.md", `${ADAPTER_PATHS.skillDirectories.claude}/agent-harness/${SKILL_ENTRY_FILE}`],
  cursor: [`${ADAPTER_PATHS.cursorRules}/main.mdc`],
  copilot: [ADAPTER_PATHS.copilotInstructions],
  kiro: [
    `${ADAPTER_PATHS.kiroSteering}/agentic-coding.md`,
    `${ADAPTER_PATHS.kiroSteering}/code-conventions.md`,
    `${ADAPTER_PATHS.kiroSteering}/product.md`,
    `${ADAPTER_PATHS.kiroSteering}/security-policies.md`,
    `${ADAPTER_PATHS.kiroSteering}/structure.md`,
    `${ADAPTER_PATHS.kiroSteering}/tech.md`,
    `${ADAPTER_PATHS.kiroSteering}/testing-standards.md`
  ],
  "github-ci": [...ADAPTER_PATHS.githubRequiredWorkflows]
};

// Drift guard: any .kiro/steering/*.md not in the manifest's active steering
// keys is silent drift. Either it's a Kiro-IDE-created file the user hasn't
// promoted yet, or a registered adapter someone forgot to declare in the
// manifest. Either way, fail the gate with a 5-step remediation.
//
// Profile-generated steering files (declared in agent-harness.profile-manifest.json)
// are excluded — those are owned by the profile system, not the steering registry.
function kiroSteeringDriftErrors(config) {
  const errors = [];
  if (!(config.adapters ?? []).includes("kiro")) return errors;
  const steeringDir = ADAPTER_PATHS.kiroSteering;
  if (!existsSync(steeringDir)) return errors;
  const registered = new Set();
  for (const [key, value] of Object.entries(config.kiro?.steering ?? {})) {
    const entry = resolveKiroSteering(config, key, value);
    if (entry.file) registered.add(entry.file);
  }
  // Add profile-generated steering paths to the allowed set.
  if (existsSync(PROFILE_MANIFEST_FILE)) {
    try {
      const manifest = readJson(PROFILE_MANIFEST_FILE);
      for (const profile of manifest.profiles ?? []) {
        if (profile.outputs?.kiroSteering) registered.add(profile.outputs.kiroSteering);
      }
    } catch {
      // ignore — profileErrors will surface manifest issues separately
    }
  }
  // Files under .kiro/steering/personal/ are workspace-local personal prefs
  // by convention (HARNESS-PERSONAL-PREFERENCES) — they're gitignored at the
  // kit level and never need to appear in the manifest. readdirSync only
  // returns top-level entries and the .endsWith(".md") guard skips
  // directories, so the personal/ subdirectory is naturally invisible to
  // this loop. The behaviour is locked by check-harness-personal-drift.test.mjs.
  const registeredFilenames = new Set(
    [...registered].map((p) => p.split("/").pop())
  );
  for (const file of readdirSync(steeringDir)) {
    if (!file.endsWith(".md")) continue;
    const fullPath = join(steeringDir, file);
    if (registered.has(fullPath)) continue;
    // Personal-shaped files get the user-scope suggestion instead of the
    // legacy 5-step canonical-promotion remediation. The classifier also
    // returns "personal" for files under the personal/ namespace, but those
    // never reach this loop (top-level scan only).
    let content = "";
    try {
      content = readFileSync(fullPath, "utf8");
    } catch {
      // Treat unreadable files as unknown — fall through to the legacy
      // remediation rather than swallowing the file.
    }
    const verdict = classifySteeringFile({
      filename: file,
      content,
      registeredFilenames
    });
    if (verdict.kind === "personal") {
      errors.push(`${fullPath}: ${personalSteeringSuggestion(file)}`);
      continue;
    }
    errors.push(
      `${fullPath}: not registered in manifest kiro.steering. ` +
        `If this is a new canonical convention, promote it: ` +
        `(1) move content to ${normalizeCanonicalsDir(config.canonicalsDir)}/<name>.md, ` +
        `(2) replace ${fullPath} with a thin adapter (run: npm run kiro:promote-steering ${file}), ` +
        `(3) add the canonical filename to canonicals in ${CONFIG_FILE}, ` +
        `(4) add the steering entry to kiro.steering with the right inclusion mode, ` +
        `(5) add a row to ${normalizeCanonicalsDir(config.canonicalsDir)}/agentic-coding-harness.md §1.`
    );
  }
  return errors;
}

// Pointer adapters (Cursor, Copilot) must contain exactly the pointer text;
// any drift means someone duplicated canonical content into the adapter.
function pointerAdapterErrors() {
  const errors = [];
  const expectedCursorRule = `---
description: Shared project instructions for Cursor agents
alwaysApply: true
---

Follow the canonical project instructions in \`AGENTS.md\`.
`;
  const expectedCopilotInstructions = `# Copilot Instructions

Follow the canonical project instructions in \`AGENTS.md\`.
`;
  const adapters = [
    { path: `${ADAPTER_PATHS.cursorRules}/main.mdc`, expected: expectedCursorRule },
    { path: ADAPTER_PATHS.copilotInstructions, expected: expectedCopilotInstructions }
  ];
  for (const { path, expected } of adapters) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    if (text !== expected) {
      errors.push(`${path}: content drifted from expected pointer-only adapter shape.`);
    }
  }
  return errors;
}

const errors = [];

if (!existsSync(CONFIG_FILE)) {
  errors.push(`missing ${CONFIG_FILE}`);
} else if (assetFilter) {
  // --asset <name>: filter to a single named skill/power and only check its
  // projections. "no asset named X" exits 0 with a stderr note rather than
  // failing — a missing name is "nothing to check," not a drift error.
  const rawConfig = readJson(CONFIG_FILE);
  const config = { ...rawConfig, skills: normalizeSkills(rawConfig.skills ?? []) };
  const projectionConfig = materializedProjectionConfig(config);
  const matchedSkills = (config.skills ?? []).filter((s) => s.name === assetFilter);
  const matchedPowers = (config.powers ?? []).filter((p) => p.name === assetFilter);
  if (matchedSkills.length === 0 && matchedPowers.length === 0) {
    console.error(`harness check: no asset named '${assetFilter}' in manifest`);
  } else {
    if (matchedSkills.length > 0) {
      errors.push(...skillErrors({ ...projectionConfig, skills: matchedSkills }));
    }
    if (matchedPowers.length > 0) {
      errors.push(...powerErrors({ ...config, powers: matchedPowers }));
    }
  }
  if (errors.length > 0) fail(errors);
  console.log(`harness check passed (asset: ${assetFilter})`);
  process.exit(0);
} else {
  const rawConfig = readJson(CONFIG_FILE);
  const config = { ...rawConfig, skills: normalizeSkills(rawConfig.skills ?? []) };
  const projectionConfig = materializedProjectionConfig(config);
  errors.push(...validateConfig(config));

  if (config.$schema && !existsSync(config.$schema)) {
    errors.push(`${CONFIG_FILE}: $schema does not resolve: ${config.$schema}`);
  }
  for (const file of config.canonicals ?? []) {
    const target = canonicalPath(config, file);
    if (!existsSync(target)) errors.push(`missing canonical: ${target}`);
  }
  for (const adapter of config.adapters ?? []) {
    if (adapter === "kiro") {
      // Only require steering files for keys declared in manifest kiro.steering.
      for (const [key, value] of Object.entries(config.kiro?.steering ?? {})) {
        const entry = resolveKiroSteering(config, key, value);
        if (!existsSync(entry.file)) {
          errors.push(`missing kiro adapter file: ${entry.file}`);
        }
      }
      continue;
    }
    for (const file of adapterFiles[adapter] ?? []) {
      const personalRoot = personalAdapterProjectionRoot(adapter);
      if (
        personalRoot !== null &&
        !projectionConfig.adapters.includes(adapter) &&
        file.startsWith(`${personalRoot}/`)
      ) {
        continue;
      }
      if (!existsSync(file)) errors.push(`missing ${adapter} adapter file: ${file}`);
    }
  }
  // HARNESS-KIT-CI-WORKFLOW-TEMPLATES: ci.yml + lifecycle-on-merge.yml are
  // now ci-block-driven (always-on by default, gated by `ci.enabled`) rather
  // than github-ci-adapter-driven. Don't flag their presence when github-ci
  // isn't declared.
  const ciBlockManagedWorkflows = new Set([
    `${ADAPTER_PATHS.githubWorkflowsTargetRoot}/ci.yml`,
    `${ADAPTER_PATHS.githubWorkflowsTargetRoot}/lifecycle-on-merge.yml`
  ]);
  for (const adapter of ADAPTERS) {
    if ((config.adapters ?? []).includes(adapter)) continue;
    if (adapter === "kiro") continue;
    for (const file of adapterFiles[adapter]) {
      if (adapter === "github-ci" && ciBlockManagedWorkflows.has(file)) continue;
      if (existsSync(file)) {
        errors.push(`adapter file exists but ${adapter} is not declared: ${file}`);
      }
    }
  }

  for (const file of workflowFilePaths(config)) {
    if (!existsSync(file)) errors.push(`missing workflow file: ${file}`);
  }
  for (const file of kiroSpecFilePaths(config)) {
    if (!existsSync(file)) errors.push(`missing Kiro spec file: ${file}`);
  }
  errors.push(...profileErrors(projectionConfig));
  errors.push(...skillErrors(projectionConfig));
  errors.push(...powerErrors(config));

  if (!existsSync("package.json")) {
    errors.push("missing package.json for configured gate scripts");
  } else {
    const scripts = readJson("package.json").scripts ?? {};
    for (const gate of config.gates ?? []) {
      const script = GATE_SCRIPTS[gate];
      if (!scripts[script]) errors.push(`package.json missing script: ${script}`);
      if (!scripts["gate:all"]?.includes(`npm run ${script}`)) {
        errors.push(`package.json gate:all does not run ${script}`);
      }
    }
    if (!scripts["gate:all"]) errors.push("package.json missing script: gate:all");
  }
}

errors.push(...kiroReferenceErrors());
if (existsSync(CONFIG_FILE)) {
  const rawCfg = readJson(CONFIG_FILE);
  const cfg = { ...rawCfg, skills: normalizeSkills(rawCfg.skills ?? []) };
  errors.push(...kiroSteeringErrors(cfg));
  errors.push(...kiroSteeringDriftErrors(cfg));
  errors.push(...agentsMdCanonicalsErrors(cfg));
  await loadAndRunPlugins(cfg, errors);
}
errors.push(...pointerAdapterErrors());

// Placeholder canonical detection — warn (non-blocking) when canonical docs
// still contain only scaffold text. Agents loading these get no useful context.
if (existsSync(CONFIG_FILE)) {
  const cfg = readJson(CONFIG_FILE);
  const canonicalsDir = normalizeCanonicalsDir(cfg.canonicalsDir);
  const PLACEHOLDER_PATTERNS = [
    /^#\s+\S+\s+Describe\s/m,
    /^Describe the \w/m
  ];
  const CRITICAL_CANONICALS = ["product.md", "tech-stack.md", "structure.md"];
  for (const file of CRITICAL_CANONICALS) {
    const filePath = canonicalsDir === "." ? file : `${canonicalsDir}/${file}`;
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, "utf8");
    const stripped = content.replace(/^#[^\n]*\n?/, "").trim();
    if (stripped.length < 80 || PLACEHOLDER_PATTERNS.some((p) => p.test(content))) {
      console.warn(
        `WARN: ${filePath} appears to be placeholder content. ` +
          `Fill in project-specific details so agents have useful context.`
      );
    }
  }
}

if (errors.length > 0) {
  fail(errors);
}
console.log("harness check passed");
