#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { COMPLETION_MODES, WORKFLOW_MODES } from "./harness-contract.mjs";
import { HARNESS_PATHS } from "./harness-paths.mjs";
import { workflowFilePaths } from "./harness-workflow.mjs";
import { fail } from "./lib.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const errors = [];

if (!existsSync(CONFIG_FILE)) {
  errors.push(`missing ${CONFIG_FILE}`);
} else {
  const config = readJson(CONFIG_FILE);
  if (!config.workflow || typeof config.workflow !== "object") {
    errors.push(`${CONFIG_FILE}: workflow must be an object`);
  } else if (!WORKFLOW_MODES.includes(config.workflow.mode)) {
    errors.push(`${CONFIG_FILE}: workflow.mode must be one of ${WORKFLOW_MODES.join(", ")}`);
  } else if (config.workflow.mode !== "none") {
    for (const field of ["backlog", "specsDir", "ticketsDir"]) {
      if (typeof config.workflow[field] !== "string" || config.workflow[field].length === 0) {
        errors.push(`${CONFIG_FILE}: workflow.${field} is required when workflow is enabled`);
      }
    }
    if (!COMPLETION_MODES.includes(config.workflow.completion)) {
      errors.push(`${CONFIG_FILE}: workflow.completion must be one of ${COMPLETION_MODES.join(", ")}`);
    }
    if (typeof config.workflow.requirePrUrl !== "boolean") {
      errors.push(`${CONFIG_FILE}: workflow.requirePrUrl must be boolean`);
    }
    for (const file of workflowFilePaths(config)) {
      if (!existsSync(file)) errors.push(`missing workflow file: ${file}`);
    }
  }
}

if (errors.length > 0) fail(errors);
console.log("workflow check passed");
