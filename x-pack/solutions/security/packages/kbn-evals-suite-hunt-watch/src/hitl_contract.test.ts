/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import Path from 'path';

/**
 * Pins where a human decision on a Proposal may come from. Scored tasks never approve or dismiss:
 * approve exists only in `proposal_gate.ts`, which only the approval spec imports, and dismiss
 * exists there and in the pre-run reset (`seed_hunt_data.ts`).
 */

const PACKAGE_ROOT = Path.resolve(__dirname, '..');
const APPROVE_OWNERS = ['src/proposal_gate.ts'];
const DISMISS_OWNERS = ['src/proposal_gate.ts', 'src/seed_hunt_data.ts'];
const GATE_IMPORTERS = ['evals/hunt_watch_approval.spec.ts'];

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = Path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return ['node_modules', 'test-results', 'target'].includes(entry)
        ? []
        : listSourceFiles(full);
    }
    return /\.tsx?$/.test(entry) && !entry.endsWith('.test.ts') ? [full] : [];
  });

const relative = (file: string) => Path.relative(PACKAGE_ROOT, file);

const filesMatching = (pattern: RegExp): string[] =>
  listSourceFiles(PACKAGE_ROOT)
    .filter((file) => pattern.test(readFileSync(file, 'utf8')))
    .map(relative)
    .sort();

describe('HITL contract', () => {
  it('references the approve route only from the gate helper', () => {
    expect(filesMatching(/PROPOSAL_APPROVE_URL|\/approve['"`]/)).toEqual(APPROVE_OWNERS);
  });

  it('references the dismiss route only from the gate helper and the pre-run reset', () => {
    expect(filesMatching(/PROPOSAL_DISMISS_URL|\/dismiss['"`]/)).toEqual(DISMISS_OWNERS);
  });

  it('imports the gate helper only from the approval spec', () => {
    expect(filesMatching(/from '\.[./]*(src\/)?proposal_gate'/)).toEqual(GATE_IMPORTERS);
  });
});
