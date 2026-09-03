import { readFileSync } from "node:fs";
import { listFiles, isTextFile, fail } from "./lib.mjs";

const errors = [];

for (const file of listFiles(".")) {
  if (!isTextFile(file)) continue;
  const content = readFileSync(file, "utf8");
  if (content.includes("\r\n")) {
    errors.push(`${file}: uses CRLF line endings`);
  }
  if (content.length > 0 && !content.endsWith("\n")) {
    errors.push(`${file}: missing final newline`);
  }
  content.split("\n").forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      errors.push(`${file}:${index + 1}: trailing whitespace`);
    }
    if (/^(<{7}|={7}|>{7}|\|{7})( |$)/.test(line)) {
      errors.push(`${file}:${index + 1}: unresolved git conflict marker`);
    }
  });
}

if (errors.length > 0) {
  fail(errors);
}

console.log("format check passed");
