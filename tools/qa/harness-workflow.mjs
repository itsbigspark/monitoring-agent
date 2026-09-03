export function workflowFileContents(config) {
  if (config.workflow?.mode === "none") return {};
  if (
    typeof config.workflow?.backlog !== "string" ||
    typeof config.workflow?.specsDir !== "string" ||
    typeof config.workflow?.ticketsDir !== "string"
  ) {
    return {};
  }
  const files = {
    [config.workflow.backlog]: `# Backlog

Track governed work here. Keep ticket IDs stable and link PRs when the repo lifecycle requires them.

| ID | Title | Status | Owner | PR | Notes |
|---|---|---|---|---|---|
| EXAMPLE-001 | Replace this row with real work | Todo | Unassigned | | |
`,
    [`${config.workflow.ticketsDir}/README.md`]: `# Tickets

Use one file per governed ticket when the work needs more detail than the backlog row.

Recommended status values: Todo, In progress, Blocked, Review, Done.
`,
    [`${config.workflow.specsDir}/_template/requirements.md`]: `# Requirements

## User Story

As a user, I want <capability> so that <outcome>.

## Acceptance Criteria

- WHEN <event> THEN <system> SHALL <response>.
`,
    [`${config.workflow.specsDir}/_template/design.md`]: `# Design

## Context

Describe the chosen approach, boundaries, and tradeoffs.

## Interfaces

List files, APIs, schemas, or contracts affected by the change.
`,
    [`${config.workflow.specsDir}/_template/tasks.md`]: `# Tasks

- [ ] Add or update tests.
- [ ] Implement the change.
- [ ] Update docs and backlog state.
- [ ] Run gates.
`
  };
  if (config.workflow.mode === "backlog") {
    return Object.fromEntries(
      Object.entries(files).filter(([path]) => path === config.workflow.backlog || path.startsWith(config.workflow.ticketsDir))
    );
  }
  return files;
}

export function workflowFilePaths(config) {
  return Object.keys(workflowFileContents(config));
}

export function kiroSpecFileContents(config) {
  if (!config.kiro?.specFolders?.enabled) return {};
  if (typeof config.kiro.specFolders.root !== "string") return {};
  const root = config.kiro.specFolders.root;
  return {
    [`${root}/README.md`]: `# Kiro Specs

Kiro feature specs live in subfolders under this directory.

Use one folder per feature and keep generated specs aligned with the repo's canonical workflow.
`,
    [`${root}/_template/requirements.md`]: `# Requirements

## User Story

As a user, I want <capability> so that <outcome>.

## Acceptance Criteria

- WHEN <event> THEN <system> SHALL <response>.
`,
    [`${root}/_template/design.md`]: `# Design

## Overview

Describe the implementation approach and key decisions.
`,
    [`${root}/_template/tasks.md`]: `# Tasks

- [ ] Write or update tests.
- [ ] Implement.
- [ ] Verify gates.
`
  };
}

export function kiroSpecFilePaths(config) {
  return Object.keys(kiroSpecFileContents(config));
}
