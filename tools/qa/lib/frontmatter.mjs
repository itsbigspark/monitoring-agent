// Shared YAML-frontmatter mutation helpers used by lifecycle scripts
// (pickup-ticket.mjs, complete-ticket.mjs).
//
// Both helpers use `[^\S\n]` (whitespace except newline) for indent and
// trailing-whitespace matching. Plain `\s*` would let the engine cross
// the line boundary on an empty field (e.g. `status:\n` or `  pr:\n`)
// and pull in the next line via `.*$` — corrupting the YAML and, in the
// links.pr case, swallowing the closing `---` fence. Consolidating the
// helpers here prevents the duplication-then-divergence pattern that
// HARNESS-LIFECYCLE-PR-REGEX (PR #11) had to fix in one copy and
// HARNESS-DEDUPE-FRONTMATTER-MUTATOR finished by extracting both.

/**
 * Update a top-level frontmatter field in a Markdown file's YAML block.
 *
 * @param {string} text - full Markdown document including a leading
 *   `---\n…\n---` frontmatter block.
 * @param {string} field - name of the top-level field to update.
 * @param {string} value - new value to write after the colon.
 * @returns {string} document with the field's value replaced.
 * @throws if the document has no frontmatter block, or if the field is
 *   not present in the block (callers should not silently add fields).
 */
export function updateFrontmatterField(text, field, value) {
  const fmMatch = text.match(/^(---\n[\s\S]*?\n---)/);
  if (!fmMatch) throw new Error("file has no YAML frontmatter");
  const fmBlock = fmMatch[1];
  const pattern = new RegExp(`^(${field}):[^\\S\\n]*.*$`, "m");
  if (!pattern.test(fmBlock)) throw new Error(`frontmatter has no field "${field}"`);
  const newFmBlock = fmBlock.replace(pattern, `$1: ${value}`);
  return text.replace(fmBlock, newFmBlock);
}

/**
 * Update the indented `links.pr` field in a Markdown file's YAML block.
 *
 * Matches any indent level (so `  pr:` and `    pr:` both work) and
 * preserves the indent. Throws if no indented `pr:` line exists — the
 * caller is responsible for ensuring `links: { pr: }` is in the spec
 * template.
 *
 * @param {string} text - full Markdown document including frontmatter.
 * @param {string} value - new value to write after `pr:`.
 * @returns {string} document with the `links.pr` value replaced.
 * @throws if the document has no frontmatter block or no indented `pr:`
 *   line inside the frontmatter.
 */
export function updateLinksPr(text, value) {
  const fmMatch = text.match(/^(---\n[\s\S]*?\n---)/);
  if (!fmMatch) throw new Error("file has no YAML frontmatter");
  const fmBlock = fmMatch[1];
  const pattern = /^([^\S\n]+pr):[^\S\n]*.*$/m;
  if (!pattern.test(fmBlock)) {
    throw new Error('frontmatter has no "links.pr" field — add it under links:');
  }
  const newFmBlock = fmBlock.replace(pattern, `$1: ${value}`);
  return text.replace(fmBlock, newFmBlock);
}
