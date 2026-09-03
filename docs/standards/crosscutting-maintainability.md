# Maintainability Review Standard

Use this standard when designing, implementing, or reviewing code that should
stay cheap to change after the current patch.

## Defaults

- Prefer one authoritative contract over duplicated constants, schemas, docs,
  tests, and generated/checker logic.
- Keep source, generated output, and user-owned files clearly separated.
- Put policy in named modules or manifests, not scattered literals.
- Make generator and validator behavior share helpers where practical.
- Add abstractions only when they remove real duplication or protect a boundary.
- Keep module ownership small enough for independent changes and reviews.

## Review Checklist

- A concept has one home: paths, enums, modes, script names, schema values,
  protocol shapes, generated file lists, and permission rules are not repeated
  without a parity test.
- When a renderer or generator changes, the checker consumes the same helper or
  has focused tests that prove it stayed aligned.
- User-owned files are not overwritten or deleted by cleanup paths unless the
  tool can prove they are unchanged generated output.
- File paths and tool namespaces are read from a manifest or shared path
  contract instead of being hardcoded at call sites.
- Cross-cutting behavior is not hidden in one large CLI or utility module when
  a smaller contract/render/check module would give clearer ownership.
- Tests cover drift, stale output, local edits, and disabled adapters.

## Common Smells

- A comment says "mirror of" another file.
- A README checklist is the only thing keeping schema, generator, checker, and
  tests aligned.
- A new adapter, gate, or mode requires edits in many unrelated files.
- Cleanup code deletes by path pattern instead of by a generated manifest and
  content hash.
- Package manager, branch, path, or host assumptions are embedded in commands
  instead of configuration.

## Non-Goals

- Do not refactor only for aesthetic consistency.
- Do not introduce generic frameworks for one call site.
- Do not widen a stable synchronous/asynchronous boundary without a concrete
  consumer need.
- Do not move repo-specific policy into reusable kit code.

## Research Basis

- [Google Software Engineering: Programming Over Time](https://abseil.io/resources/swe-book/html/ch01.html)
- [Twelve-Factor App: Config](https://12factor.net/config)
- [Semantic Versioning](https://semver.org/)
