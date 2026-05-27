#!/usr/bin/env node
/*
 * Reads `npx playwright test --list --reporter=json` output and prints the number of
 * unique logical specs (file:line:title), matching team_automation_inventory methodology.
 *
 * Usage:
 *   cd <dir-with-playwright.config.ts>
 *   npx playwright test --list --reporter=json > /tmp/pw.json
 *   node path/to/count_playwright_list_unique_specs.mjs /tmp/pw.json
 */

import fs from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: count_playwright_list_unique_specs.mjs <playwright-list.json>');
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(path, 'utf8'));
const keys = new Set();

function walkSuites(suites) {
  if (!suites) {
    return;
  }
  for (const s of suites) {
    if (s.specs) {
      for (const sp of s.specs) {
        keys.add(`${sp.file}:${sp.line}:${sp.title}`);
      }
    }
    walkSuites(s.suites);
  }
}

walkSuites(j.suites);
console.log(keys.size);
