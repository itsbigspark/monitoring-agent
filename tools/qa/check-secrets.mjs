#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fail, listFiles } from "./lib.mjs";

const PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "possible AWS access key"],
  [/ghp_[A-Za-z0-9_]{30,}/, "possible GitHub personal access token"],
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "possible Anthropic key"],
  [/-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, "private key block"]
];

const errors = [];
for (const file of listFiles(process.cwd())) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const [pattern, label] of PATTERNS) {
    if (pattern.test(text)) errors.push(`${file}: ${label}`);
  }
}

if (errors.length > 0) fail(errors);
console.log("secret check passed");
