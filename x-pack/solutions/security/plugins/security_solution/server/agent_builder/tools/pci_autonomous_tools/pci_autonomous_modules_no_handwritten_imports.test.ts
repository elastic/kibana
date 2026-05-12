/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * CI lockdown for the autonomous PCI tool tree.
 *
 * Asserts that **no source file under `pci_autonomous_tools/`** imports from
 * any of the hand-written sibling's surfaces. The deep-autonomy guarantee
 * documented in `comparison.html` §1.5 is that the autonomous variant
 * authors BOTH the agent-facing surface (tools + skill content) AND the
 * underlying domain engine independently — so the deny-list spans the full
 * hand-written PCI tree, not just the three engine modules:
 *
 *   Hand-written tools (sibling of `pci_autonomous_tools/`):
 *     - pci_compliance_tool.ts            (the orchestrator tool)
 *     - pci_compliance_evaluator.ts       (engine: verdict + scoring)
 *     - pci_compliance_requirements.ts    (engine: requirement catalog)
 *     - pci_compliance_schemas.ts         (engine: zod schemas + types)
 *     - pci_field_mapper_tool.ts          (ECS field mapping helper)
 *     - pci_scope_discovery_tool.ts       (scope discovery helper)
 *
 *   Hand-written skill module:
 *     - server/agent_builder/skills/pci_compliance/**   (content + plumbing)
 *
 * If this test fails it means somebody (model OR human) introduced a
 * convenience import from the hand-written variant. Either:
 *   1. The autonomous side is missing a helper — port it independently
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

/**
 * Hand-written PCI module tokens that must never appear inside an import
 * statement under `pci_autonomous_tools/`. Each token is matched against the
 * last path segment of an import specifier (with an optional `.ts` suffix).
 *
 * Anchored on a path-boundary (`/`, `'`, or `"`) so substrings inside longer
 * names don't false-match (e.g. blocking `pci_compliance_evaluator` should
 * not also block a hypothetical future `pci_compliance_evaluator_v2_shim`,
 * because that's a different module and should be evaluated on its own).
 */
const FORBIDDEN_HAND_WRITTEN_MODULES = [
  'pci_compliance_tool',
  'pci_compliance_evaluator',
  'pci_compliance_requirements',
  'pci_compliance_schemas',
  'pci_field_mapper_tool',
  'pci_scope_discovery_tool',
];

const FORBIDDEN_IMPORT_PATTERNS: RegExp[] = [
  ...FORBIDDEN_HAND_WRITTEN_MODULES.map(
    (name) => new RegExp(`from\\s+['"][^'"]*[\\/'"]${name}(?:\\.ts)?['"]`)
  ),
  // Anything under the hand-written skill folder.
  /from\s+['"][^'"]*\/skills\/pci_compliance\/[^'"]+['"]/,
];

// Comment / docstring references to the hand-written module names are
// allowed — they document the independence claim. Block only IMPORT statements.
const COMMENT_PATTERNS = [
  /^\s*\*/, // continuation of a block comment
  /^\s*\/\*/, // start of a block comment
  /^\s*\/\//, // line comment
];

const isComment = (line: string): boolean => COMMENT_PATTERNS.some((pattern) => pattern.test(line));

function collectTsFiles(dir: string, accumulator: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectTsFiles(fullPath, accumulator);
    } else if (stats.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts')) {
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

  it('no file under pci_autonomous_tools/ imports from any hand-written PCI surface (tools, engine, or skill folder)', () => {
    const offendersByFile = new Map<string, string[]>();
    for (const file of tsFiles) {
      const contents = readFileSync(file, 'utf8');
      const lines = contents.split('\n');
      const offending: string[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!isComment(line)) {
          for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
            if (pattern.test(line)) {
              offending.push(`  line ${i + 1}: ${line.trim()}`);
            }
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
        `Found forbidden import(s) from a hand-written PCI surface inside the autonomous ` +
          `tool tree. The autonomous variant must use only its own surfaces ` +
          `(pci_autonomous_* tools + engine modules, and the pci_compliance_autonomous skill).\n` +
          `Blocked module tokens: ${FORBIDDEN_HAND_WRITTEN_MODULES.join(', ')}, ` +
          `plus anything under skills/pci_compliance/.\n\n${summary}`
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
        /from\s+['"]\.\/pci_autonomous_(requirements|evaluator|schemas)['"]/.test(contents);
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
