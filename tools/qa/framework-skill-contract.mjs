const REQUIRED_SECTIONS = Object.freeze([
  "Project introspection",
  "Version matrix",
  "Do",
  "Don't",
  "Anti-patterns checklist",
  "Rules"
]);

const FRAMEWORK_SKILL_KINDS = Object.freeze(["curated", "vendored"]);
const SEVERITY_PATTERN = /^\- \[(must-follow|should-follow|nice-to-have)\]\s+/;
const TOOL_SPECIFIC_PATH_PATTERN =
  /(?:^|[\s`(])(?:\.claude\/|\.kiro\/|\.agents\/|\.cursor\/|\.github\/skills\/)/m;

function parseFrontmatter(text, source, errors, { strictFields }) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    errors.push(`${source}: missing YAML frontmatter`);
    return { metadata: {}, body: "" };
  }

  const metadata = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    if (/^\s/.test(rawLine)) continue;
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 1) {
      errors.push(`${source}: malformed frontmatter line ${JSON.stringify(rawLine)}`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (strictFields && !["name", "description"].includes(key)) {
      errors.push(
        `${source}: unsupported frontmatter field ${JSON.stringify(key)}; ` +
          "curated framework skills use only name and description"
      );
      continue;
    }
    metadata[key] = value;
  }
  return {
    metadata,
    body: text.slice(match[0].length).trim()
  };
}

function sectionRange(text, heading) {
  const marker = `## ${heading}`;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trimEnd() === marker);
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      end = index;
      break;
    }
  }
  return {
    start,
    body: lines.slice(start + 1, end).join("\n").trim()
  };
}

function validateRules(body, source, errors) {
  const rules = body
    .split(/\r?\n(?=- )/)
    .map((rule) => rule.trim())
    .filter((rule) => rule.startsWith("- "));
  if (rules.length === 0) {
    errors.push(`${source}: Rules must contain at least one severity-tiered rule`);
    return;
  }
  for (const rule of rules) {
    const preview = rule.split(/\r?\n/, 1)[0];
    if (!SEVERITY_PATTERN.test(rule)) {
      errors.push(
        `${source}: rule must start with exactly one severity tier ` +
          `(must-follow, should-follow, nice-to-have): ${preview}`
      );
    }
    if (!/https:\/\/[^\s>)]+/.test(rule)) {
      errors.push(`${source}: rule must include an inline https:// public source: ${preview}`);
    }
  }
}

function validateCommon(text, source, errors, { strictFields }) {
  const { metadata, body } = parseFrontmatter(text, source, errors, {
    strictFields
  });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(metadata.name ?? "")) {
    errors.push(`${source}: frontmatter name must be a lowercase hyphenated skill name`);
  }
  if (!(metadata.description ?? "").includes("Use when")) {
    errors.push(
      `${source}: frontmatter description must include a precise "Use when" trigger`
    );
  }
  if (!body) {
    errors.push(`${source}: skill body must not be empty`);
  }
  if (TOOL_SPECIFIC_PATH_PATTERN.test(text)) {
    errors.push(
      `${source}: canonical framework content must not contain tool-specific projection paths`
    );
  }
}

function validateCurated(text, source, errors) {
  const sections = new Map();
  for (const heading of REQUIRED_SECTIONS) {
    const range = sectionRange(text, heading);
    if (range === null) {
      errors.push(`${source}: missing required section "## ${heading}"`);
    } else {
      sections.set(heading, range);
    }
  }
  const presentStarts = REQUIRED_SECTIONS
    .map((heading) => sections.get(heading)?.start)
    .filter((value) => value !== undefined);
  if (presentStarts.some((value, index) => index > 0 && value < presentStarts[index - 1])) {
    errors.push(
      `${source}: required section order must be ${REQUIRED_SECTIONS.join(" -> ")}`
    );
  }

  const introspection = sections.get("Project introspection")?.body ?? "";
  if (!/\b(lock|manifest|dependencies|requirements)\b/i.test(introspection)) {
    errors.push(`${source}: Project introspection must inspect dependency evidence`);
  }
  if (!/\bunknown\b/i.test(introspection)) {
    errors.push(`${source}: Project introspection must define the unknown-version fallback`);
  }

  const matrix = sections.get("Version matrix")?.body ?? "";
  if (!/\|[^|]+\|/.test(matrix) || !/[<>=]|\bthrough\b|\bto\b/i.test(matrix)) {
    errors.push(`${source}: Version matrix must map version ranges to applicable guidance`);
  }

  for (const heading of ["Do", "Don't"]) {
    if (!(sections.get(heading)?.body ?? "").trim()) {
      errors.push(`${source}: ${heading} section must contain concrete guidance`);
    }
  }

  const antiPatterns = sections.get("Anti-patterns checklist")?.body ?? "";
  const checklistItems = antiPatterns.match(/^- \[[ xX]\] /gm) ?? [];
  if (checklistItems.length < 3) {
    errors.push(`${source}: Anti-patterns checklist must contain at least three items`);
  }

  validateRules(sections.get("Rules")?.body ?? "", source, errors);
}

export function localSkillReferences(text) {
  const paths = [];
  const pattern = /\]\((?!https?:\/\/|mailto:|#)([^)\s#]+)(?:#[^)]+)?\)/g;
  for (const match of text.matchAll(pattern)) {
    const path = match[1].replace(/^<|>$/g, "");
    if (path && !paths.includes(path)) paths.push(path);
  }
  return paths;
}

export function validateFrameworkSkillText(
  text,
  source = "SKILL.md",
  { kind = "curated" } = {}
) {
  const errors = [];
  if (!FRAMEWORK_SKILL_KINDS.includes(kind)) {
    return [
      `${source}: unsupported framework skill kind ${JSON.stringify(kind)}; ` +
        `expected one of ${FRAMEWORK_SKILL_KINDS.join(", ")}`
    ];
  }

  validateCommon(text, source, errors, {
    strictFields: kind === "curated"
  });
  if (kind === "curated") validateCurated(text, source, errors);
  return errors;
}

export const FRAMEWORK_SKILL_CONTRACT = Object.freeze({
  schema_version: "harness.framework-skill.v2",
  kinds: FRAMEWORK_SKILL_KINDS,
  sections: REQUIRED_SECTIONS,
  severity_tiers: Object.freeze([
    "must-follow",
    "should-follow",
    "nice-to-have"
  ])
});
