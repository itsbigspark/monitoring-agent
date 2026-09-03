// Personal-vs-canonical classifier for `.kiro/steering/<file>.md`.
//
// Background. Pre-HARNESS-PERSONAL-PREFERENCES, the drift guard treated every
// unregistered file in `.kiro/steering/` the same: emit the 5-step
// "promote to canonical" remediation. That misdiagnosed a real recurring case
// — individual contributors committing personal AI-interaction preferences
// (e.g. "I prefer concise answers", "use explicit confidence levels") into
// the project repo. Those files shouldn't be promoted to canonical because
// they aren't canonical content; they belong in user scope
// (`~/.kiro/steering/<name>.md`) or the workspace-local personal namespace
// (`.kiro/steering/personal/<name>.md`).
//
// `classifySteeringFile` is the single source of truth for that decision and
// is shared between:
//   - the drift guard in templates/core/tools/qa/check-harness.mjs
//     (substitutes the personal-suggestion remediation for personal files)
//   - the second pass in templates/core/tools/qa/promote-kiro-steering.mjs
//     (warns + skips for personal files instead of leaving them for the
//     drift guard to misdiagnose later)
//
// Heuristics, in order of precedence (first match wins):
//   1. namespace  — caller-asserted `.kiro/steering/personal/` membership
//   2. canonical  — the file is in the manifest's kiro.steering map
//   3. filename   — bare lowercase first-name token (`alice.md`, `bob.md`)
//                   per the in-the-wild incident pattern
//   4. content    — first 10 non-blank lines contain a personal-instructions
//                   header OR first-person markers ("I prefer", "I want")
//   5. unknown    — none of the above; legacy "promote to canonical OR remove"
//                   remediation still applies
//
// The classifier is pure (no fs / process state). Both call sites pass in
// already-resolved registered filenames + already-loaded content text.

const PERSONAL_HEADER = /^#\s*(my\s+)?personal(\s+(instructions|preferences))?\b/i;
const FIRST_PERSON_MARKERS = [
  /\bI\s+(prefer|want|need|like|always|never|usually|don['’]t)\b/i,
  /\bdon['’]t\s+(tell|patronize|patronise|capitulate|anchor)\s+me\b/i,
  /\bmy\s+personal\b/i
];
// Lowercase token, no hyphens, no `-steering`/`-prefs` suffix, plausible as a
// human first-name screen name. Conservative: between 3 and 20 chars to keep
// real canonicals (`tech.md`, `product.md`, `agentic-coding.md`) outside the
// match. The manifest-membership check (heuristic #2) takes precedence so
// `tech.md` is never classified as personal even if it sneaks through here.
const BARE_NAME_FILENAME = /^[a-z][a-z]{2,19}\.md$/;

function inFirstNonBlankLines(text, n) {
  const lines = [];
  for (const line of text.split(/\r?\n/)) {
    if (lines.length >= n) break;
    if (line.trim().length === 0) continue;
    lines.push(line);
  }
  return lines.join("\n");
}

export function classifySteeringFile({
  filename,
  content = "",
  registeredFilenames = new Set(),
  inPersonalNamespace = false
} = {}) {
  if (inPersonalNamespace) {
    return { kind: "personal", reason: "namespace" };
  }
  if (registeredFilenames.has(filename)) {
    return { kind: "canonical", reason: "manifest" };
  }
  if (BARE_NAME_FILENAME.test(filename)) {
    return { kind: "personal", reason: "filename" };
  }
  const head = inFirstNonBlankLines(content, 10);
  if (PERSONAL_HEADER.test(head)) {
    return { kind: "personal", reason: "content" };
  }
  for (const marker of FIRST_PERSON_MARKERS) {
    if (marker.test(head)) {
      return { kind: "personal", reason: "content" };
    }
  }
  return { kind: "unknown", reason: "no-match" };
}

// Single-source-of-truth remediation copy. Both the drift guard and the
// promote tool emit this so contributors see one consistent message. The
// trailing rationale ("kit doesn't reach into user scope") is intentional —
// it tells reviewers WHY the kit can only suggest, not auto-move.
export function personalSteeringSuggestion(filename) {
  const name = filename.replace(/^.*\//, "");
  return (
    `${name} looks like personal preferences (first-person markers or a ` +
    `bare-name filename). Personal AI-interaction preferences belong in ` +
    `user scope, not the project repo. Move to one of:\n` +
    `  - ~/.kiro/steering/${name}  (user scope: applies in every project on this machine)\n` +
    `  - .kiro/steering/personal/${name}  (workspace-local namespace: gitignored, applies only here)\n` +
    `The kit cannot reach into ~/.kiro/steering for you; copy the file there ` +
    `manually and remove the workspace copy.`
  );
}

// Convenience wrapper for call sites that want to know whether a path lives
// inside the workspace-local personal namespace. Kept here so the namespace
// constant is colocated with the classifier.
export const PERSONAL_NAMESPACE_DIR = "personal";

export function isInPersonalNamespace(relativePath) {
  // relativePath is expected to be a path relative to .kiro/steering/, with
  // forward slashes (e.g. "personal/alice.md"). Tolerant of leading "./".
  const normalised = relativePath.replace(/^\.\//, "").replace(/\\/g, "/");
  return normalised.startsWith(`${PERSONAL_NAMESPACE_DIR}/`);
}
