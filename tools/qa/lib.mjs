import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { isRepoLocalPluginPath } from "./harness-validate.mjs";
import { HARNESS_PATHS as HARNESS_PATHS_CONTRACT } from "./harness-paths.mjs";

export const PLUGIN_API_VERSION = 1;
export {
  ADAPTER_PATHS,
  GENERATED_MANAGED_ROOTS,
  HARNESS_PATHS,
  KIRO_STEERING_DEFAULTS,
  ROOT_CANONICAL_FILES,
  SKILL_ENTRY_FILE,
  canonicalPath,
  defaultSkillPath,
  isRootCanonical,
  isSkillFilePath,
  normalizeCanonicalsDir,
  resolveKiroSteering,
  titleizeKey
} from "./harness-paths.mjs";

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".next",
  ".pnpm-store",
  "dist",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  ".venv",
  "__pycache__",
  ".pytest_cache",
  ".ruff_cache",
  ".mypy_cache"
]);

const ignoredWorkspaceRoots = new Set(
  HARNESS_PATHS_CONTRACT.personalWorkspaceRoots.map((path) => path.replace(/\/+$/, ""))
);

const textExtensions = new Set([
  ".json",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".py",
  ".md",
  ".mdc",
  ".yml",
  ".yaml",
  ".toml",
  ".txt"
]);

export function listFiles(dir = ".") {
  const root = resolve(dir);

  function visit(current) {
    const results = [];
    for (const entry of readdirSync(current)) {
      if (ignoredDirs.has(entry)) continue;
      if (entry.endsWith(".egg-info")) continue;
      const path = join(current, entry);
      const relativePath = relative(root, resolve(path)).replaceAll("\\", "/");
      if (ignoredWorkspaceRoots.has(relativePath)) continue;
      const stats = statSync(path);
      if (stats.isDirectory()) {
        results.push(...visit(path));
      } else {
        results.push(path);
      }
    }
    return results;
  }

  return visit(dir).sort();
}

export function isTextFile(path) {
  return textExtensions.has(path.slice(path.lastIndexOf(".")));
}

export function fail(messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  for (const message of list) {
    console.error(message);
  }
  process.exit(1);
}

export async function loadAndRunPlugins(config, errors) {
  if (!Array.isArray(config.plugins)) return;
  for (const pluginPath of config.plugins) {
    if (typeof pluginPath !== "string" || pluginPath.length === 0) continue;
    if (!isRepoLocalPluginPath(pluginPath)) continue;
    let plugin;
    try {
      plugin = await import(pathToFileURL(resolve(process.cwd(), pluginPath)).href);
    } catch (error) {
      errors.push(`plugin ${pluginPath}: import failed: ${error.message}`);
      continue;
    }

    const apiVersion = plugin.PLUGIN_API_VERSION ?? 1;
    if (typeof apiVersion === "number" && apiVersion > PLUGIN_API_VERSION) {
      console.warn(`plugin ${pluginPath}: declares PLUGIN_API_VERSION ${apiVersion}, but this kit supports ${PLUGIN_API_VERSION}`);
    }

    if (typeof plugin.validateHarness !== "function") continue;
    try {
      const result = await plugin.validateHarness(config);
      if (!Array.isArray(result)) {
        errors.push(`plugin ${pluginPath}: validateHarness returned non-array`);
        continue;
      }
      for (const error of result) {
        errors.push(`plugin ${pluginPath}: ${error}`);
      }
    } catch (error) {
      errors.push(`plugin ${pluginPath}: validateHarness threw: ${error.message}`);
    }
  }
}
