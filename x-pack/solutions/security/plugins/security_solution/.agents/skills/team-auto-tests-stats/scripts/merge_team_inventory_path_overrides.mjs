#!/usr/bin/env node
/**
 * Merges stdin (one repo-relative CODEOWNERS path prefix per line) with
 * team_inventory_path_overrides.json paths for inventory-only attribution.
 *
 * Usage:
 *   grep ... CODEOWNERS | awk ... | node merge_team_inventory_path_overrides.mjs @elastic/foo
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDE_FILE = path.join(SCRIPT_DIR, 'team_inventory_path_overrides.json');

/**
 * @param {string} s
 */
function normPathPrefix(s) {
  return s.trim().replace(/^\/+/u, '').replace(/[/\\]*$/u, '');
}

async function loadOverrides(teamFull) {
  try {
    const raw = fs.readFileSync(OVERRIDE_FILE, 'utf8');
    const data = /** @type {Record<string, string[]>} */ (JSON.parse(raw));
    const extra = data[teamFull];
    if (!Array.isArray(extra)) {
      return [];
    }
    return extra.map((p) => normPathPrefix(String(p))).filter(Boolean);
  } catch (e) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      /** @type {{ code?: string }} */ (e).code === 'ENOENT'
    ) {
      return [];
    }
    console.error(`${path.basename(import.meta.url)}: failed reading ${OVERRIDE_FILE}: ${e}`);
    process.exit(1);
  }
}

async function main() {
  const teamFull = process.argv[2];
  if (!teamFull || !teamFull.startsWith('@')) {
    console.error(
      `Usage: node merge_team_inventory_path_overrides.mjs @elastic/<team>\nstdin: path prefixes`
    );
    process.exit(1);
  }

  const extraPaths = await loadOverrides(teamFull);
  /** @type {Set<string>} */
  const out = new Set();

  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) {
    const n = normPathPrefix(line);
    if (n) {
      out.add(n);
    }
  }

  for (const p of extraPaths) {
    out.add(p);
  }

  const sorted = [...out].sort();
  for (const p of sorted) {
    console.log(p);
  }
}

await main();
