#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { HARNESS_PATHS } from "./harness-paths.mjs";
import {
  materializedProjectionConfig,
  profileErrors
} from "./harness-validate.mjs";
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
  if (!Array.isArray(config.profiles)) {
    errors.push(`${CONFIG_FILE}: profiles must be an array`);
  } else {
    errors.push(...profileErrors(materializedProjectionConfig(config)));
  }
}

if (errors.length > 0) fail(errors);
console.log("profiles check passed");
