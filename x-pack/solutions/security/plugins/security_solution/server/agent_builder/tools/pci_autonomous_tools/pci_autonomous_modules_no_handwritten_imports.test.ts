/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * CI lockdown for the autonomous PCI tool tree.
 *
 * Asserts that **no source file under `pci_autonomous_tools/`** imports from the
 * hand-written sibling's engine modules (`pci_compliance_requirements`,
 * `pci_compliance_evaluator`, `pci_compliance_schemas`). This is the deep-
 * autonomy guarantee documented in `comparison.html` §1.5: the agent-facing
 * surface AND the underlying domain engine are independently authored.
 *
 * If this test fails it means somebody (model OR human) introduced a
 * convenience import from the hand-written variant. Either:
 *   1. The autonomous engine is missing a helper — port it independently
 *      (different naming, different shape) rather than importing.
 *   2. The autonomous module imported it by accident — replace with the
 *      autonomous-side equivalent (e.g. `evaluateAutonomousRequirement` for
 *      `evaluateRequirement`).
 *
 * Diff-style failure messages list the offending file and import line.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

const AUTONOMOUS_ROOT = resolve(__dirname);

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*pci_compliance_requirements(?:\.ts)?['"]/,
  /from\s+['"][^'"]*pci_compliance_evaluator(?:\.ts)?['"]/,
  /from\s+['"][^'"]*pci_compliance_schemas(?:\.ts)?['"]/,
];

// Comment / docstring references to the hand-written module names are
// allowed — they document the independence claim. Block only IMPORT statements.
const COMMENT_PATTERNS = [
  /^\s*\*/, // continuation of a block comment
  /^\s*\/\*/, // start of a block comment
  /^\s*\/\//, // line comment
];

const isComment = (line: string): boolean =>
  COMMENT_PATTERNS.some((pattern) => pattern.test(line));

function collectTsFiles(dir: string, accumulator: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectTsFiles(fullPath, accumulator);
    } else if (
      stats.isFile() &&
      fullPath.endsWith('.ts') &&
      !fullPath.endsWith('.test.ts')
    ) {
      accumulator.push(fullPath);
    }
  }
  return accumulator;
}

describe('pci_autonomous_tools — engine independence lockdown', () => {
  const tsFiles = collectTsFiles(AUTONOMOUS_ROOT);

  it('discovers at least the four tool files and three engine modules', () => {
    const expectedNames = [
      'pci_autonomous_scope_discovery_tool.ts',
      'pci_autonomous_compliance_check_tool.ts',
      'pci_autonomous_scorecard_report_tool.ts',
      'pci_autonomous_field_mapper_tool.ts',
      'pci_autonomous_requirements.ts',
      'pci_autonomous_evaluator.ts',
      'pci_autonomous_schemas.ts',
    ];
    for (const name of expectedNames) {
      expect(tsFiles.some((p) => p.endsWith(name))).toBe(true);
    }
  });

  it('no file under pci_autonomous_tools/ imports from pci_compliance_(requirements|evaluator|schemas)', () => {
    const offendersByFile = new Map<string, string[]>();
    for (const file of tsFiles) {
      const contents = readFileSync(file, 'utf8');
      const lines = contents.split('\n');
      const offending: string[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (isComment(line)) continue;
        for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
          if (pattern.test(line)) {
            offending.push(`  line ${i + 1}: ${line.trim()}`);
          }
        }
      }
      if (offending.length > 0) {
        offendersByFile.set(file, offending);
      }
    }
    if (offendersByFile.size > 0) {
      const summary = Array.from(offendersByFile.entries())
        .map(([file, lines]) => `${file}\n${lines.join('\n')}`)
        .join('\n\n');
      throw new Error(
        `Found forbidden import(s) from the hand-written PCI engine inside the autonomous ` +
          `tool tree. The autonomous variant must use only its own engine modules ` +
          `(pci_autonomous_*).\n\n${summary}`
      );
    }
    expect(offendersByFile.size).toBe(0);
  });

  it('each tool file imports at least one autonomous engine module', () => {
    const TOOL_FILES = tsFiles.filter((f) => f.endsWith('_tool.ts'));
    expect(TOOL_FILES.length).toBeGreaterThanOrEqual(4);
    for (const file of TOOL_FILES) {
      const contents = readFileSync(file, 'utf8');
      const importsAutonomousEngine =
        /from\s+['"]\.\/pci_autonomous_(requirements|evaluator|schemas)['"]/.test(
          contents
        );
      if (!importsAutonomousEngine) {
        throw new Error(
          `${file} does not import any autonomous engine module. The engine independence ` +
            `claim assumes every tool routes through pci_autonomous_requirements / _evaluator / ` +
            `_schemas — if a tool genuinely needs no engine helpers, add a comment explaining why ` +
            `and update this lockdown to allow it.`
        );
      }
    }
  });
});
