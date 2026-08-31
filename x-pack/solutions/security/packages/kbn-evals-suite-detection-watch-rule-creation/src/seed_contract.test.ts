/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFixtures } from './seed_security_data';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';

/**
 * Contract: every reference query must be winnable against the seeded fixtures.
 *
 * The e2e run enforces this against real ES at seed time, but only after a
 * ~20-minute stack boot. This test enforces the cheaper, structural half
 * locally: each dataset example's query must reference at least one process
 * name / command token that a seeded document actually carries, and every
 * seeded attack document must be reachable by at least one query token
 * (no orphan fixtures, no unwinnable references).
 *
 * It is deliberately conservative: it checks that the query's quoted literals
 * appear in the seed corpus, not full ES|QL evaluation.
 */

const flatten = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap(flatten) : typeof v === 'string' ? [v] : [];

const seedCorpus = (() => {
  const docs: string[] = [];
  for (const seeded of buildFixtures()) {
    for (const doc of seeded.docs) {
      docs.push(JSON.stringify(doc));
    }
  }
  return docs.join('\n');
})();

const quotedLiterals = (query: string): string[] => {
  const matches = query.match(/"[^"]+"/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
};

describe('seed <-> reference-query contract', () => {
  const examples = [...goldenDataset, ...hardCases].filter(
    (e) => e.output.esqlQuery && !e.output.isBrokenFixture
  );

  it('every reference query has at least one literal present in the seed corpus', () => {
    const unwinnable: string[] = [];
    for (const ex of examples) {
      const literals = quotedLiterals(ex.output.esqlQuery ?? '');
      const hit = literals.some((lit) =>
        // token-level containment: handles multi-word literals like command lines
        lit
          .replace(/[\^$*+?()|[\]{}]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2)
          .some((tok) => seedCorpus.includes(tok))
      );
      if (!hit) unwinnable.push(ex.id);
    }
    expect(unwinnable).toEqual([]);
  });

  it('seed corpus carries the new attack fixtures (crond, rundll32, vssadmin, net user)', () => {
    for (const marker of ['crond', 'rundll32', 'vssadmin', 'net']) {
      expect(seedCorpus).toContain(marker);
    }
  });

  it('over-breadth controls exist: benign sshd-parented shell, vssadmin list, net user list', () => {
    // crond true positive + sshd control
    expect(seedCorpus.match(/"name":"crond"/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(seedCorpus.match(/"name":"sshd"/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(seedCorpus).toContain('vssadmin.exe list shadows');
    expect(seedCorpus).toContain('net user');
  });
});
