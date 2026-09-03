// Validation surface shared between the kit binary (`agent-harness check`)
// and the consumer-shipped `harness:check` script.
//
// Helpers in this module either return error arrays (additive) or pure
// strings/booleans. They never call `fail()` or `process.exit()` — call sites
// decide whether to halt or aggregate. Filesystem reads honour `process.cwd()`
// so callers must run from the consumer repo root (which both call sites do).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import {
  ADAPTERS,
  BIGSPARK_PACKAGE_ECOSYSTEMS,
  COMPLETION_MODES,
  GATE_SCRIPTS,
  SHARED_APPLICATION_GATE_COMMAND,
  SHARED_APPLICATION_GATE_WORKFLOW,
  SHARED_APPLICATION_BUILD_WORKFLOW,
  SKILL_MANAGERS,
  STEERING_MODES,
  WORKFLOW_MODES
} from "./harness-contract.mjs";
import {
  ADAPTER_PATHS,
  HARNESS_PATHS,
  defaultSkillPath,
  isPowerFilePath,
  isSkillFilePath,
  resolveKiroSteering
} from "./harness-paths.mjs";
import { renderCanonicalsBlock } from "./harness-projections.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const PROFILE_MANIFEST_FILE = HARNESS_PATHS.profileManifest;
const FULL_COMMIT_PATTERN = /^[a-f0-9]{40}$/;

// projectType enum lives here rather than in harness-contract.mjs because it's
// only consumed by validateConfig today. Promote to harness-contract.mjs if a
// second consumer appears.
export const PROJECT_TYPES = Object.freeze(["node", "python", "jvm", "polyglot", "none"]);

const KIT_CANONICALS_BEGIN = "<!-- KIT-CANONICALS:BEGIN -->";
const KIT_CANONICALS_END = "<!-- KIT-CANONICALS:END -->";

const PERSONAL_ADAPTER_PROJECTION_ROOTS = Object.freeze({
  codex: ADAPTER_PATHS.skillDirectories.codex,
  claude: ADAPTER_PATHS.skillDirectories.claude,
  cursor: ADAPTER_PATHS.cursorRules
});

export function personalAdapterProjectionRoot(adapter) {
  return PERSONAL_ADAPTER_PROJECTION_ROOTS[adapter] ?? null;
}

export function materializedProjectionConfig(config, baseDir = process.cwd()) {
  const adapters = (config.adapters ?? []).filter((adapter) => {
    const root = personalAdapterProjectionRoot(adapter);
    return root === null || existsSync(join(baseDir, root));
  });
  return { ...config, adapters };
}

export function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return skills;
  return skills.map((skill) => {
    if (typeof skill === "string") {
      return { name: skill, path: defaultSkillPath(skill), managedBy: "repo" };
    }
    if (skill && typeof skill === "object" && !Array.isArray(skill)) {
      return {
        ...skill,
        path: skill.path ?? defaultSkillPath(skill.name),
        managedBy: skill.managedBy ?? "repo"
      };
    }
    return skill;
  });
}

export function isRepoLocalPluginPath(path) {
  return !isAbsolute(path) && !path.split(/[\\/]+/).includes("..");
}

// validateConfig produces a flat list of error strings against the given
// manifest. Pure: no fs / process.cwd dependence except via `profileExists`,
// which is dependency-injected so the kit (which validates against its own
// `profiles/` clone) and the consumer (which doesn't ship that registry) can
// share one validator.
//
// Resolved divergences vs the pre-extraction copies:
//   - kit-only `_kit_version` type check: kept (consumer was missing it).
//   - kit-only `projectType` enum check: kept (consumer was missing it).
//   - kit-only `profileExists` membership check: now opt-in via DI.
//   - kit's longer fileMatch wording wins (mentions both object form and
//     legacy `kiro.fileMatches.<key>`).
//   - error ordering normalised to the kit's existing order
//     (gates check before profiles).
export function validateConfig(config, { profileExists } = {}) {
  const errors = [];
  if (config.version !== 1) errors.push(`${CONFIG_FILE}: version must be 1`);
  if (typeof config.canonicalsDir !== "string" || config.canonicalsDir.length === 0) {
    errors.push(`${CONFIG_FILE}: canonicalsDir must be a non-empty string`);
  }
  if (!Array.isArray(config.adapters)) errors.push(`${CONFIG_FILE}: adapters must be an array`);
  if (!Array.isArray(config.canonicals)) errors.push(`${CONFIG_FILE}: canonicals must be an array`);
  if (!Array.isArray(config.gates)) errors.push(`${CONFIG_FILE}: gates must be an array`);
  if (!Array.isArray(config.profiles)) errors.push(`${CONFIG_FILE}: profiles must be an array`);
  if (config.skills !== undefined && !Array.isArray(config.skills)) errors.push(`${CONFIG_FILE}: skills must be an array`);
  if (config.powers !== undefined && !Array.isArray(config.powers)) errors.push(`${CONFIG_FILE}: powers must be an array`);
  if (config.plugins !== undefined && !Array.isArray(config.plugins)) errors.push(`${CONFIG_FILE}: plugins must be an array`);
  if (config.pluginConfig !== undefined && (typeof config.pluginConfig !== "object" || config.pluginConfig === null || Array.isArray(config.pluginConfig))) {
    errors.push(`${CONFIG_FILE}: pluginConfig must be an object`);
  }
  if (config.standards?.dir !== undefined && typeof config.standards.dir !== "string") {
    errors.push(`${CONFIG_FILE}: standards.dir must be a string`);
  }
  if (config.topology !== undefined && (typeof config.topology !== "object" || Array.isArray(config.topology))) {
    errors.push(`${CONFIG_FILE}: topology must be an object`);
  }
  if (
    config.ci !== undefined
    && (
      config.ci === null
      || typeof config.ci !== "object"
      || Array.isArray(config.ci)
    )
  ) {
    errors.push(`${CONFIG_FILE}: ci must be an object`);
  } else if (config.ci !== undefined) {
    const allowedCiFields = new Set([
      "enabled",
      "baseBranches",
      "specRoot",
      "nodeVersion",
      "sharedApplicationGate",
      "sharedApplicationBuild",
      "lifecycle"
    ]);
    const unknownCiFields = Object.keys(config.ci)
      .filter((key) => !allowedCiFields.has(key));
    if (unknownCiFields.length > 0) {
      errors.push(
        `${CONFIG_FILE}: ci contains unsupported field(s): ${unknownCiFields.sort().join(", ")}`
      );
    }
  }
  if (config.ci?.sharedApplicationGate !== undefined) {
    const shared = config.ci.sharedApplicationGate;
    if (!shared || typeof shared !== "object" || Array.isArray(shared)) {
      errors.push(`${CONFIG_FILE}: ci.sharedApplicationGate must be an object`);
    } else {
      const allowed = new Set([
        "workflow",
        "commit",
        "setupCommand",
        "packageEcosystem",
        "gateCommand"
      ]);
      const unknown = Object.keys(shared).filter((key) => !allowed.has(key));
      if (unknown.length > 0) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationGate contains unsupported field(s): ${unknown.sort().join(", ")}`
        );
      }
      if (shared.workflow !== SHARED_APPLICATION_GATE_WORKFLOW) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationGate.workflow must be ${SHARED_APPLICATION_GATE_WORKFLOW}`
        );
      }
      if (
        typeof shared.commit !== "string"
        || !FULL_COMMIT_PATTERN.test(shared.commit)
      ) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationGate.commit must be a full lowercase Git commit`
        );
      }
      if (
        typeof shared.setupCommand !== "string"
        || shared.setupCommand.length === 0
        || /[\r\n\0]/.test(shared.setupCommand)
      ) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationGate.setupCommand must be a non-empty single-line string`
        );
      }
      if (!BIGSPARK_PACKAGE_ECOSYSTEMS.includes(shared.packageEcosystem)) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationGate.packageEcosystem must be one of ${BIGSPARK_PACKAGE_ECOSYSTEMS.join(", ")}`
        );
      }
      if (shared.gateCommand !== SHARED_APPLICATION_GATE_COMMAND) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationGate.gateCommand must be ${SHARED_APPLICATION_GATE_COMMAND}`
        );
      }
    }
  }
  if (config.ci?.sharedApplicationBuild !== undefined) {
    const shared = config.ci.sharedApplicationBuild;
    if (!shared || typeof shared !== "object" || Array.isArray(shared)) {
      errors.push(
        `${CONFIG_FILE}: ci.sharedApplicationBuild must be an object`
      );
    } else {
      const allowed = new Set([
        "workflow",
        "commit",
        "setupCommand",
        "packageEcosystem",
        "gateCommand"
      ]);
      const unknown = Object.keys(shared).filter((key) => !allowed.has(key));
      if (unknown.length > 0) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild contains unsupported field(s): ${unknown.sort().join(", ")}`
        );
      }
      if (shared.workflow !== SHARED_APPLICATION_BUILD_WORKFLOW) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild.workflow must be ${SHARED_APPLICATION_BUILD_WORKFLOW}`
        );
      }
      if (
        typeof shared.commit !== "string"
        || !FULL_COMMIT_PATTERN.test(shared.commit)
      ) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild.commit must be a full lowercase Git commit`
        );
      }
      if (
        typeof shared.setupCommand !== "string"
        || shared.setupCommand.length === 0
        || /[\r\n\0]/.test(shared.setupCommand)
      ) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild.setupCommand must be a non-empty single-line string`
        );
      }
      if (!BIGSPARK_PACKAGE_ECOSYSTEMS.includes(shared.packageEcosystem)) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild.packageEcosystem must be one of ${BIGSPARK_PACKAGE_ECOSYSTEMS.join(", ")}`
        );
      }
      if (shared.gateCommand !== SHARED_APPLICATION_GATE_COMMAND) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild.gateCommand must be ${SHARED_APPLICATION_GATE_COMMAND}`
        );
      }
      if (!config.ci.sharedApplicationGate) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild requires ci.sharedApplicationGate`
        );
      } else if (
        shared.setupCommand
        !== config.ci.sharedApplicationGate.setupCommand
      ) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild.setupCommand must match ci.sharedApplicationGate.setupCommand`
        );
      }
      if (
        config.ci.sharedApplicationGate
        && shared.packageEcosystem
          !== config.ci.sharedApplicationGate.packageEcosystem
      ) {
        errors.push(
          `${CONFIG_FILE}: ci.sharedApplicationBuild.packageEcosystem must match ci.sharedApplicationGate.packageEcosystem`
        );
      }
    }
  }
  if (!config.workflow || typeof config.workflow !== "object") {
    errors.push(`${CONFIG_FILE}: workflow must be an object`);
  }
  if (config._kit_version !== undefined && typeof config._kit_version !== "string") {
    errors.push(`${CONFIG_FILE}: _kit_version must be a string when present`);
  }
  if (config.projectType !== undefined && !PROJECT_TYPES.includes(config.projectType)) {
    errors.push(`${CONFIG_FILE}: projectType must be one of ${PROJECT_TYPES.join(", ")}`);
  }

  for (const adapter of config.adapters ?? []) {
    if (!ADAPTERS.includes(adapter)) errors.push(`${CONFIG_FILE}: unknown adapter: ${adapter}`);
  }
  for (const gate of config.gates ?? []) {
    if (!Object.hasOwn(GATE_SCRIPTS, gate)) errors.push(`${CONFIG_FILE}: unknown gate: ${gate}`);
  }
  if (typeof profileExists === "function") {
    for (const profileId of config.profiles ?? []) {
      if (!profileExists(profileId)) errors.push(`${CONFIG_FILE}: unknown profile: ${profileId}`);
    }
  }
  if (Array.isArray(config.plugins)) {
    for (const pluginPath of config.plugins) {
      if (typeof pluginPath !== "string" || pluginPath.length === 0) {
        errors.push(`${CONFIG_FILE}: plugins entries must be non-empty strings`);
      } else if (!isRepoLocalPluginPath(pluginPath)) {
        errors.push(`${CONFIG_FILE}: plugin path must be repo-local and relative: ${pluginPath}`);
      }
    }
  }
  const skillNames = new Set();
  if (Array.isArray(config.skills)) {
    for (const skill of config.skills) {
      if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
        errors.push(`${CONFIG_FILE}: skills entries must be strings or objects`);
        continue;
      }
      if (typeof skill.name !== "string" || skill.name.length === 0) {
        errors.push(`${CONFIG_FILE}: skills[].name must be a non-empty string`);
        continue;
      }
      if (!/^[a-z0-9][a-z0-9-]*$/.test(skill.name)) {
        errors.push(`${CONFIG_FILE}: skills.${skill.name} name must be kebab-case`);
      }
      if (skillNames.has(skill.name)) errors.push(`${CONFIG_FILE}: duplicate skill: ${skill.name}`);
      skillNames.add(skill.name);
      if (typeof skill.path !== "string" || skill.path.length === 0) {
        errors.push(`${CONFIG_FILE}: skills.${skill.name}.path must be a non-empty string`);
      } else if (!isSkillFilePath(skill.path)) {
        errors.push(`${CONFIG_FILE}: skills.${skill.name}.path must point to a SKILL.md file`);
      }
      if (!SKILL_MANAGERS.includes(skill.managedBy)) {
        errors.push(`${CONFIG_FILE}: skills.${skill.name}.managedBy must be one of ${SKILL_MANAGERS.join(", ")}`);
      }
      if (skill.asset !== undefined && typeof skill.asset !== "string") {
        errors.push(`${CONFIG_FILE}: skills.${skill.name}.asset must be a string`);
      }
      if (skill.version !== undefined && typeof skill.version !== "string") {
        errors.push(`${CONFIG_FILE}: skills.${skill.name}.version must be a string`);
      }
    }
  }
  const powerNames = new Set();
  if (Array.isArray(config.powers)) {
    for (const power of config.powers) {
      if (!power || typeof power !== "object" || Array.isArray(power)) {
        errors.push(`${CONFIG_FILE}: powers entries must be objects`);
        continue;
      }
      if (typeof power.name !== "string" || power.name.length === 0) {
        errors.push(`${CONFIG_FILE}: powers[].name must be a non-empty string`);
        continue;
      }
      if (!/^[a-z0-9][a-z0-9-]*$/.test(power.name)) {
        errors.push(`${CONFIG_FILE}: powers.${power.name} name must be kebab-case`);
      }
      if (powerNames.has(power.name)) errors.push(`${CONFIG_FILE}: duplicate power: ${power.name}`);
      powerNames.add(power.name);
      if (typeof power.path !== "string" || power.path.length === 0) {
        errors.push(`${CONFIG_FILE}: powers.${power.name}.path must be a non-empty string`);
      } else if (!isPowerFilePath(power.path)) {
        errors.push(`${CONFIG_FILE}: powers.${power.name}.path must point to a POWER.md file`);
      }
      if (power.managedBy !== undefined && !SKILL_MANAGERS.includes(power.managedBy)) {
        errors.push(`${CONFIG_FILE}: powers.${power.name}.managedBy must be one of ${SKILL_MANAGERS.join(", ")}`);
      }
      if (power.asset !== undefined && typeof power.asset !== "string") {
        errors.push(`${CONFIG_FILE}: powers.${power.name}.asset must be a string`);
      }
      if (power.version !== undefined && typeof power.version !== "string") {
        errors.push(`${CONFIG_FILE}: powers.${power.name}.version must be a string`);
      }
    }
  }
  if ((config.gates ?? []).length === 0) errors.push(`${CONFIG_FILE}: at least one gate is required`);
  if ((config.profiles ?? []).length > 0 && !(config.gates ?? []).includes("profiles")) {
    errors.push(`${CONFIG_FILE}: profiles gate is required when profiles are enabled`);
  }
  if (!WORKFLOW_MODES.includes(config.workflow?.mode)) {
    errors.push(`${CONFIG_FILE}: workflow.mode must be one of ${WORKFLOW_MODES.join(", ")}`);
  }
  if (config.workflow?.mode !== "none") {
    for (const field of ["backlog", "specsDir", "ticketsDir"]) {
      if (typeof config.workflow?.[field] !== "string" || config.workflow[field].length === 0) {
        errors.push(`${CONFIG_FILE}: workflow.${field} is required when workflow is enabled`);
      }
    }
    if (!COMPLETION_MODES.includes(config.workflow?.completion)) {
      errors.push(`${CONFIG_FILE}: workflow.completion must be one of ${COMPLETION_MODES.join(", ")}`);
    }
    if (typeof config.workflow?.requirePrUrl !== "boolean") {
      errors.push(`${CONFIG_FILE}: workflow.requirePrUrl must be boolean`);
    }
    if (!(config.gates ?? []).includes("workflow")) {
      errors.push(`${CONFIG_FILE}: workflow gate is required when workflow.mode is ${config.workflow.mode}`);
    }
  }
  if (!["relative", "root"].includes(config.kiro?.referenceStyle)) {
    errors.push(`${CONFIG_FILE}: kiro.referenceStyle must be relative or root`);
  }
  for (const [key, value] of Object.entries(config.kiro?.steering ?? {})) {
    // Validate value shape: string mode OR object with mode + optional fields.
    const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
    const isString = typeof value === "string";
    if (!isString && !isObject) {
      errors.push(`${CONFIG_FILE}: kiro.steering.${key} must be a mode string or override object`);
      continue;
    }
    const mode = isString ? value : value.mode;
    if (!STEERING_MODES.includes(mode)) {
      errors.push(`${CONFIG_FILE}: kiro.steering.${key} mode must be ${STEERING_MODES.join(", ")}`);
    }
    if (isObject) {
      if (value.canonical !== undefined && typeof value.canonical !== "string") {
        errors.push(`${CONFIG_FILE}: kiro.steering.${key}.canonical must be a string`);
      }
      if (value.title !== undefined && typeof value.title !== "string") {
        errors.push(`${CONFIG_FILE}: kiro.steering.${key}.title must be a string`);
      }
      if (value.fileMatchPattern !== undefined && !Array.isArray(value.fileMatchPattern)) {
        errors.push(`${CONFIG_FILE}: kiro.steering.${key}.fileMatchPattern must be an array`);
      }
    }
    if (mode === "fileMatch") {
      const objectPattern = isObject && Array.isArray(value.fileMatchPattern) ? value.fileMatchPattern : null;
      const legacyPattern = config.kiro?.fileMatches?.[key];
      if (!objectPattern && !Array.isArray(legacyPattern)) {
        errors.push(`${CONFIG_FILE}: kiro.steering.${key} mode is fileMatch but no fileMatchPattern provided (object form) or kiro.fileMatches.${key} (legacy)`);
      }
    }
  }
  if (typeof config.kiro?.specFolders === "boolean") {
    errors.push(`${CONFIG_FILE}: kiro.specFolders must be an object; use { "enabled": true, "root": ".kiro/specs" }`);
  }
  if (config.kiro?.specFolders?.enabled) {
    if (!(config.adapters ?? []).includes("kiro")) {
      errors.push(`${CONFIG_FILE}: kiro.specFolders requires the kiro adapter`);
    }
    if (typeof config.kiro.specFolders.root !== "string" || config.kiro.specFolders.root.length === 0) {
      errors.push(`${CONFIG_FILE}: kiro.specFolders.root is required when Kiro spec folders are enabled`);
    }
  }
  // pre-commit-hooks[]: shape checks here; file-existence check is delegated
  // to preCommitHookErrors() (uses fs) which validateConfig appends below so
  // both call sites see the same error stream.
  const hooks = config["pre-commit-hooks"];
  const hookEntries = [];
  if (hooks !== undefined) {
    if (!Array.isArray(hooks)) {
      errors.push(`${CONFIG_FILE}: pre-commit-hooks must be an array`);
    } else {
      const seen = new Set();
      for (const entry of hooks) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          errors.push(`${CONFIG_FILE}: pre-commit-hooks entries must be objects`);
          continue;
        }
        if (typeof entry.name !== "string" || entry.name.length === 0) {
          errors.push(`${CONFIG_FILE}: pre-commit-hooks[].name must be a non-empty string`);
          continue;
        }
        if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.name)) {
          errors.push(`${CONFIG_FILE}: pre-commit-hooks.${entry.name} name must be kebab-case`);
        }
        if (seen.has(entry.name)) {
          errors.push(`${CONFIG_FILE}: duplicate pre-commit-hook: ${entry.name}`);
        }
        seen.add(entry.name);
        if (typeof entry.path !== "string" || entry.path.length === 0) {
          errors.push(`${CONFIG_FILE}: pre-commit-hooks.${entry.name}.path must be a non-empty string`);
        } else if (!isRepoLocalPluginPath(entry.path)) {
          // Mirrors the plugins[] guard: install-time enforcement also lives
          // in the asset-manager (AM-020 PreCommitHookConfig validator), but
          // we keep the kit-side guard so a hand-edited manifest can't smuggle
          // an absolute or `..`-traversing path past harness:check.
          errors.push(`${CONFIG_FILE}: pre-commit-hooks.${entry.name}.path must be repo-local and relative: ${entry.path}`);
        } else {
          hookEntries.push(entry);
        }
        if (entry.managedBy !== undefined && !PRE_COMMIT_HOOK_MANAGERS.includes(entry.managedBy)) {
          errors.push(`${CONFIG_FILE}: pre-commit-hooks.${entry.name}.managedBy must be one of ${PRE_COMMIT_HOOK_MANAGERS.join(", ")}`);
        }
        if (entry.asset !== undefined && typeof entry.asset !== "string") {
          errors.push(`${CONFIG_FILE}: pre-commit-hooks.${entry.name}.asset must be a string`);
        }
        if (entry.version !== undefined && typeof entry.version !== "string") {
          errors.push(`${CONFIG_FILE}: pre-commit-hooks.${entry.name}.version must be a string`);
        }
      }
    }
  }
  // File-existence pass for shape-valid entries. Folded into validateConfig
  // so consumers and the kit binary see the missing-file error in the same
  // stream as the shape errors above (matches the ticket's "harness:check
  // validates each declared file exists" promise without requiring a second
  // wiring point in check-harness.mjs).
  errors.push(...preCommitHookErrors(hookEntries));
  return errors;
}

// Manager taxonomy for pre-commit-hooks[]. asset-manager: written by
// the-one-asset-manager (AM-020). consumer: hand-rolled / outside any
// installer. Schema enforces the same enum.
export const PRE_COMMIT_HOOK_MANAGERS = Object.freeze(["asset-manager", "consumer"]);

// Existence-only check for repo-local pre-commit hook scripts. Shape errors
// are produced by validateConfig before we get here, so this only runs for
// shape-valid entries. Returns a flat error array (no throws).
//
// baseDir defaults to process.cwd() to match the rest of this file's call
// sites (kiroReferenceErrors, profileErrors, etc); pass an explicit baseDir
// in tests that drive a tmpdir without process.chdir().
export function preCommitHookErrors(entries, baseDir = process.cwd()) {
  const errors = [];
  if (!Array.isArray(entries)) return errors;
  for (const entry of entries) {
    if (!entry || typeof entry.path !== "string") continue;
    const abs = isAbsolute(entry.path) ? entry.path : join(baseDir, entry.path);
    if (!existsSync(abs)) {
      errors.push(
        `${CONFIG_FILE}: pre-commit-hooks.${entry.name} declared file does not exist: ${entry.path}`
      );
    }
  }
  return errors;
}

// Walks .kiro/steering/*.md, validates each has a #[[file:...]] reference and
// the reference resolves on disk. The pre-extraction kit copy ran without the
// `## heading` duplication guard; that guard was consumer-only. We adopt the
// stricter consumer behaviour because (a) it's purely additive — kit repos
// have no steering files so the new check is a no-op there, and (b) "no new
// behaviour" applies to consumer-observable behaviour, which already saw the
// guard.
export function kiroReferenceErrors() {
  const errors = [];
  const steeringDir = ADAPTER_PATHS.kiroSteering;
  if (!existsSync(steeringDir)) return errors;
  for (const file of readdirSync(steeringDir)) {
    if (!file.endsWith(".md")) continue;
    const path = join(steeringDir, file);
    if (!statSync(path).isFile()) continue;
    const text = readFileSync(path, "utf8");
    const match = text.match(/#\[\[file:(.+?)\]\]/);
    if (!match) {
      errors.push(`${path}: missing #[[file:...]] reference`);
      continue;
    }
    const target = match[1];
    const resolved = target.startsWith(".")
      ? resolve(dirname(path), target)
      : resolve(process.cwd(), target);
    if (!existsSync(resolved)) {
      errors.push(`${path}: reference does not resolve: ${target}`);
    }
    if (/^##\s+/m.test(text)) {
      errors.push(`${path}: appears to duplicate canonical content; keep steering adapters thin`);
    }
  }
  return errors;
}

export function kiroSteeringErrors(config) {
  const errors = [];
  if (!(config.adapters ?? []).includes("kiro")) return errors;
  for (const [key, value] of Object.entries(config.kiro?.steering ?? {})) {
    const entry = resolveKiroSteering(config, key, value);
    if (!existsSync(entry.file)) continue;
    const text = readFileSync(entry.file, "utf8");
    if (!text.includes(`inclusion: ${entry.mode}`)) {
      errors.push(`${entry.file}: inclusion mode does not match manifest (${entry.mode})`);
    }
    if (entry.mode === "fileMatch") {
      for (const pattern of entry.fileMatchPattern ?? []) {
        if (!text.includes(pattern)) {
          errors.push(`${entry.file}: missing fileMatchPattern entry from manifest: ${pattern}`);
        }
      }
    }
  }
  return errors;
}

// Drift check for AGENTS.md's KIT-CANONICALS managed block. Marker absence is
// a warning (legacy AGENTS.md, opt-in to migrate). One marker present is an
// error. Both present + content drift is an error pointing at
// `agent-harness generate`. The trailing remediation hint suggests
// `npm run regen` because consumers usually run that — kit authors hitting it
// will read the same hint and pick whichever applies.
export function agentsMdCanonicalsErrors(config) {
  const errors = [];
  const path = "AGENTS.md";
  if (!existsSync(path)) return errors;
  const text = readFileSync(path, "utf8");
  const beginIdx = text.indexOf(KIT_CANONICALS_BEGIN);
  const endIdx = text.indexOf(KIT_CANONICALS_END);
  if (beginIdx === -1 && endIdx === -1) {
    console.warn(`${path}: no KIT-CANONICALS markers; skipping canonicals drift check. Add ${KIT_CANONICALS_BEGIN} / ${KIT_CANONICALS_END} to opt in.`);
    return errors;
  }
  if (beginIdx === -1 || endIdx === -1) {
    errors.push(`${path}: only one of ${KIT_CANONICALS_BEGIN} / ${KIT_CANONICALS_END} is present; restore both.`);
    return errors;
  }
  const inner = text.slice(beginIdx + KIT_CANONICALS_BEGIN.length, endIdx).replace(/^\n|\n$/g, "");
  const expected = renderCanonicalsBlock(config);
  if (inner !== expected) {
    errors.push(`${path}: KIT-CANONICALS block drifted from canonicals[]; run \`agent-harness generate\` (or \`npm run regen\`) to refresh.`);
  }
  return errors;
}

export function profileErrors(config) {
  const errors = [];
  if ((config.profiles ?? []).length === 0) return errors;
  if (!existsSync(PROFILE_MANIFEST_FILE)) {
    errors.push(`missing ${PROFILE_MANIFEST_FILE}`);
    return errors;
  }
  const manifest = JSON.parse(readFileSync(PROFILE_MANIFEST_FILE, "utf8"));
  const manifestIds = new Set((manifest.profiles ?? []).map((profile) => profile.id));
  for (const profileId of config.profiles) {
    if (!manifestIds.has(profileId)) errors.push(`${PROFILE_MANIFEST_FILE}: missing profile entry: ${profileId}`);
  }
  for (const profile of manifest.profiles ?? []) {
    if (!config.profiles.includes(profile.id)) {
      errors.push(`${PROFILE_MANIFEST_FILE}: profile is generated but not declared: ${profile.id}`);
    }
    const expectedOutputs = ["standards"];
    if ((config.adapters ?? []).includes("codex")) expectedOutputs.push("codexSkill");
    if ((config.adapters ?? []).includes("claude")) expectedOutputs.push("claudeSkill");
    if ((config.adapters ?? []).includes("cursor")) expectedOutputs.push("cursorRule");
    if ((config.adapters ?? []).includes("kiro")) expectedOutputs.push("kiroSteering");
    for (const outputName of expectedOutputs) {
      if (!profile.outputs?.[outputName]) {
        errors.push(`${PROFILE_MANIFEST_FILE}: ${profile.id} missing output for current adapters: ${outputName}`);
        continue;
      }
      const path = profile.outputs[outputName];
      if (!existsSync(path)) {
        errors.push(`missing profile ${profile.id} ${outputName}: ${path}`);
      }
    }
  }
  return errors;
}

// Re-export so consumers / tests can pull canonical shape constants from the
// validator entry point.
export { CONFIG_FILE, PROFILE_MANIFEST_FILE, KIT_CANONICALS_BEGIN, KIT_CANONICALS_END };
