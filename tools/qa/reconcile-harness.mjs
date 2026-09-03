#!/usr/bin/env node

/**
 * reconcile-harness.mjs
 *
 * Cascades changes in agent-harness.config.json profiles[] to the profile
 * manifest and filesystem. Run after removing profiles from the config to
 * clean up orphaned steering files, standards files, and manifest entries.
 *
 * Usage: npm run harness:reconcile
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { HARNESS_PATHS } from "./harness-paths.mjs";

const CONFIG_FILE = HARNESS_PATHS.config;
const PROFILE_MANIFEST_FILE = HARNESS_PATHS.profileManifest;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  if (!existsSync(CONFIG_FILE)) {
    console.error(`${CONFIG_FILE} not found. Nothing to reconcile.`);
    process.exit(1);
  }

  if (!existsSync(PROFILE_MANIFEST_FILE)) {
    console.log("No profile manifest found. Nothing to reconcile.");
    process.exit(0);
  }

  const config = readJson(CONFIG_FILE);
  const manifest = readJson(PROFILE_MANIFEST_FILE);

  const declaredProfiles = new Set(config.profiles ?? []);
  const kept = [];
  const removed = [];

  for (const profile of manifest.profiles ?? []) {
    if (declaredProfiles.has(profile.id)) {
      kept.push(profile);
    } else {
      removed.push(profile);
    }
  }

  if (removed.length === 0) {
    console.log("All manifest profiles are declared in config. Nothing to reconcile.");
    process.exit(0);
  }

  // Remove orphaned files for each removed profile
  for (const profile of removed) {
    console.log(`Removing profile: ${profile.id}`);
    for (const [outputName, outputPath] of Object.entries(profile.outputs ?? {})) {
      if (existsSync(outputPath)) {
        rmSync(outputPath);
        console.log(`  - Deleted ${outputPath} (${outputName})`);
      } else {
        console.log(`  - Already absent: ${outputPath} (${outputName})`);
      }
    }
  }

  // Write updated manifest
  const updatedManifest = { profiles: kept };
  writeFileSync(PROFILE_MANIFEST_FILE, JSON.stringify(updatedManifest, null, 2) + "\n");
  console.log(`\nProfile manifest updated (${kept.length} profiles kept, ${removed.length} removed).`);
  console.log("Run: npm run gate:all to verify.");
}

main();
