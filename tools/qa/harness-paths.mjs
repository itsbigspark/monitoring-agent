const PERSONAL_ADAPTER_GITIGNORE_ENTRIES = Object.freeze([
  ".claude/",
  ".agents/",
  ".cursor/",
  ".github/copilot/"
]);

const PERSONAL_WORKSPACE_ROOTS = Object.freeze([
  ...PERSONAL_ADAPTER_GITIGNORE_ENTRIES,
  ".kiro/steering/personal/"
]);

export const HARNESS_PATHS = Object.freeze({
  config: "agent-harness.config.json",
  profileManifest: "agent-harness.profile-manifest.json",
  generatedManifest: ".agent-harness/generated.json",
  defaultCanonicalsDir: "docs/ai",
  defaultStandardsDir: "docs/standards",
  skillSourceRoot: "agent-harness/skills",
  // Powers are Kiro-only per AM-020 design — see ADAPTER_PATHS.powerDirectories.
  powerSourceRoot: "agent-harness/powers",
  kiroSpecsDefault: ".kiro/specs",
  adapters: Object.freeze({
    skillDirectories: Object.freeze({
      codex: ".agents/skills",
      claude: ".claude/skills",
      kiro: ".kiro/skills"
    }),
    // Powers project to .kiro/powers/<name>/ only. Other adapters intentionally
    // omitted: power is a Kiro-specific primitive and the asset-manager-side
    // CompatibilityTable already warns the consumer when other adapters are
    // declared (unsupported_warn). Keep this map narrow so future contributors
    // don't accidentally extend power projection cross-tool.
    powerDirectories: Object.freeze({
      kiro: ".kiro/powers"
    }),
    cursorRules: ".cursor/rules",
    kiroSteering: ".kiro/steering",
    copilotInstructions: ".github/copilot-instructions.md",
    // Workflow files that the github-ci adapter installs by default. The
    // legacy agent-harness.yml ships for back-compat; ci.yml + codeql.yml are
    // the actively required pair (mirrored in the github-ci ADAPTER_FILES
    // contract). Lifecycle workflow is conditional — see githubLifecycleWorkflow.
    githubWorkflows: Object.freeze([
      ".github/workflows/agent-harness.yml",
      ".github/workflows/ci.yml",
      ".github/workflows/codeql.yml"
    ]),
    // Required github-ci adapter files (subset of githubWorkflows: ci + codeql
    // are required, agent-harness.yml is back-compat-only).
    githubRequiredWorkflows: Object.freeze([
      ".github/workflows/ci.yml",
      ".github/workflows/codeql.yml"
    ]),
    // Lifecycle workflow installed only when workflow.completion === "in-pr".
    githubLifecycleWorkflow: ".github/workflows/lifecycle-on-merge.yml",
    // Source root for the github-ci adapter inside the kit's templates tree.
    githubWorkflowsSourceRoot: "templates/adapters/github-ci/.github/workflows",
    // Target directory for the github-ci adapter's workflows in consumer repos.
    githubWorkflowsTargetRoot: ".github/workflows",
    // HARNESS-V1-POSITIONING. Personal (per-developer) adapter projection
    // directories — gitignored by `agent-harness init` so each contributor
    // can pick their preferred AI coding tool locally without forcing that
    // choice on the rest of the team. The scope is deliberately
    // `.github/copilot/` (not the broader `.github/`) so governance /
    // inventory files (CODEOWNERS, workflows, dependabot.yml, issue
    // templates) remain committed.
    personalAdapterGitignoreEntries: PERSONAL_ADAPTER_GITIGNORE_ENTRIES
  }),
  personalWorkspaceRoots: PERSONAL_WORKSPACE_ROOTS
});

export const ADAPTER_PATHS = HARNESS_PATHS.adapters;

export const GENERATED_MANAGED_ROOTS = Object.freeze([
  ...Object.values(ADAPTER_PATHS.skillDirectories),
  ...Object.values(ADAPTER_PATHS.powerDirectories),
  ADAPTER_PATHS.cursorRules,
  ADAPTER_PATHS.kiroSteering
]);

export const ROOT_CANONICAL_FILES = Object.freeze(["AGENTS.md", "CLAUDE.md"]);
export const SKILL_ENTRY_FILE = "SKILL.md";
export const POWER_ENTRY_FILE = "POWER.md";

// Default steering registry. Legacy filenames are preserved for the 7 default
// keys; new keys derive `.kiro/steering/<key>.md` from the manifest key.
export const KIRO_STEERING_DEFAULTS = Object.freeze({
  product: { file: `${ADAPTER_PATHS.kiroSteering}/product.md`, canonicalFile: "product.md", title: "Product Steering" },
  tech: { file: `${ADAPTER_PATHS.kiroSteering}/tech.md`, canonicalFile: "tech-stack.md", title: "Technology Steering" },
  structure: { file: `${ADAPTER_PATHS.kiroSteering}/structure.md`, canonicalFile: "structure.md", title: "Structure Steering" },
  codeConventions: { file: `${ADAPTER_PATHS.kiroSteering}/code-conventions.md`, canonicalFile: "code-conventions.md", title: "Code Conventions Steering" },
  security: { file: `${ADAPTER_PATHS.kiroSteering}/security-policies.md`, canonicalFile: "security-policies.md", title: "Security Policies Steering" },
  testing: { file: `${ADAPTER_PATHS.kiroSteering}/testing-standards.md`, canonicalFile: "testing-standards.md", title: "Testing Standards Steering" },
  agenticCoding: { file: `${ADAPTER_PATHS.kiroSteering}/agentic-coding.md`, canonicalFile: "agentic-coding.md", title: "Agentic Coding Steering" }
});

export function isRootCanonical(fileName) {
  return ROOT_CANONICAL_FILES.includes(fileName);
}

export function normalizeCanonicalsDir(value, fallback = HARNESS_PATHS.defaultCanonicalsDir) {
  const raw = typeof value === "string" && value.length > 0 ? value : fallback;
  let dir = raw.replace(/^\.\//, "").replace(/\/+$/, "");
  return dir.length === 0 ? "." : dir;
}

export function canonicalPath(config, fileName) {
  if (isRootCanonical(fileName)) return fileName;
  const dir = normalizeCanonicalsDir(config.canonicalsDir);
  return dir === "." ? fileName : `${dir}/${fileName}`;
}

export function defaultSkillPath(name) {
  return `${HARNESS_PATHS.skillSourceRoot}/${name}/${SKILL_ENTRY_FILE}`;
}

export function isSkillFilePath(path) {
  if (typeof path !== "string") return false;
  const normalised = path.replace(/\\/g, "/");
  return normalised === SKILL_ENTRY_FILE || normalised.endsWith(`/${SKILL_ENTRY_FILE}`);
}

export function defaultPowerPath(name) {
  return `${HARNESS_PATHS.powerSourceRoot}/${name}/${POWER_ENTRY_FILE}`;
}

export function isPowerFilePath(path) {
  if (typeof path !== "string") return false;
  const normalised = path.replace(/\\/g, "/");
  return normalised === POWER_ENTRY_FILE || normalised.endsWith(`/${POWER_ENTRY_FILE}`);
}

export function titleizeKey(key) {
  const parts = key
    .split("-")
    // Split only at lowercase/digit -> uppercase boundaries so all-caps runs
    // like "STEERING" stay intact instead of fragmenting to "S T E E R I N G".
    .flatMap((segment) => segment.split(/(?<=[a-z0-9])(?=[A-Z])/))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      // Title-case all-caps segments (STEERING -> Steering) for visual
      // consistency and so the don't-double-suffix-Steering guard fires.
      if (/^[A-Z]+$/.test(segment)) {
        return segment.charAt(0) + segment.slice(1).toLowerCase();
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    });
  const base = parts.join(" ");
  if (/steering$/i.test(base)) return base;
  return `${base} Steering`;
}

export function resolveKiroSteering(config, key, value) {
  const defaults = KIRO_STEERING_DEFAULTS[key] ?? {};
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const mode = isObject ? value.mode : value;
  const canonicalFile = (isObject && value.canonical) || defaults.canonicalFile || `${key}.md`;
  const title = (isObject && value.title) || defaults.title || titleizeKey(key);
  let fileMatchPattern;
  if (isObject && Array.isArray(value.fileMatchPattern)) {
    fileMatchPattern = value.fileMatchPattern;
  } else if (Array.isArray(config.kiro?.fileMatches?.[key])) {
    fileMatchPattern = config.kiro.fileMatches[key];
  }
  const file = defaults.file ?? `${ADAPTER_PATHS.kiroSteering}/${key}.md`;
  return { file, title, canonicalFile, mode, fileMatchPattern };
}
