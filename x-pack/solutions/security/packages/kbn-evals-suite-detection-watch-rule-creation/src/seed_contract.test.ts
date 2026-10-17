/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTH_INDEX, SEEDED_INDEX_PATTERNS, buildFixtures } from './seed_security_data';
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

describe('term-level match operators', () => {
  // `field : "value"` matches a WHOLE term. A seeded arg like `javascript:..\\RunHtml`
  // is one token and does NOT match `process.args : "javascript"` — build 470 failed
  // exactly this way, so assert the terms the `:` clauses need exist verbatim.
  it('every `field : "literal"` clause has that literal as a standalone seeded term', () => {
    const terms = new Set<string>();
    for (const index of buildFixtures()) {
      for (const doc of index.docs) {
        JSON.stringify(doc)
          .split(/["\s,\[\]{}]+/)
          .filter(Boolean)
          .forEach((t) => terms.add(t));
      }
    }

    const missing: string[] = [];
    for (const ex of [...goldenDataset, ...hardCases]) {
      const query = ex.output.esqlQuery ?? '';
      query.replace(/\w[\w.]*\s*:\s*"([^"]+)"/g, (_match, literal: string) => {
        if (!literal.includes('*') && !terms.has(literal)) {
          missing.push(`${ex.id}: ${literal}`);
        }
        return '';
      });
    }
    expect(missing).toEqual([]);
  });
});

describe('T1078.001 auth-log fixture (logs-system.auth)', () => {
  const authFixtureDocs = buildFixtures().find((f) => f.index === AUTH_INDEX)?.docs as Array<{
    event: { outcome: string; dataset: string };
    process: { name: string };
    host: { name: string; os: { type: string } };
    user: { name: string };
    message: string;
  }>;
  const authDocs = () => authFixtureDocs;
  const defaultUserFailures = () =>
    authDocs().filter(
      (d) =>
        d.event.outcome === 'failure' &&
        ['su', 'sudo'].includes(d.process.name) &&
        ['admin', 'root', 'administrator', 'guest'].includes(d.user.name)
    );

  it('is seeded, and is an index pattern the hygiene guard accepts', () => {
    expect(authDocs()?.length).toBeGreaterThan(0);
    expect(SEEDED_INDEX_PATTERNS).toContain('logs-system.auth');
  });

  it('carries su/sudo failures with default usernames across the 3 Linux endpoints the gap names', () => {
    const hosts = new Set(defaultUserFailures().map((d) => d.host.name));
    expect([...hosts].sort()).toEqual(['linux-build-02', 'linux-cron-01', 'linux-web-01']);
    expect(new Set(defaultUserFailures().map((d) => d.process.name))).toEqual(
      new Set(['su', 'sudo'])
    );
    for (const doc of authDocs()) {
      expect(doc.host.os.type).toBe('linux');
      expect(doc.event.dataset).toBe('system.auth');
    }
  });

  it('writes auth-log messages, not process-start events', () => {
    for (const doc of defaultUserFailures()) {
      expect(doc.message.length).toBeGreaterThan(0);
      expect(doc.message).toMatch(/authentication failure|incorrect password/);
    }
  });

  it('keeps benign controls an over-broad rule would wrongly match', () => {
    const benign = authDocs().filter((d) => !defaultUserFailures().includes(d));
    expect(benign.length).toBeGreaterThanOrEqual(3);
    expect(benign.some((d) => d.event.outcome === 'success')).toBe(true);
    expect(benign.some((d) => d.event.outcome === 'failure')).toBe(true);
    for (const doc of benign) {
      expect(['admin', 'root', 'administrator', 'guest']).not.toContain(doc.user.name);
    }
  });

  it('shares host identities with the process fixtures, so the endpoint data tells one story', () => {
    const processHosts = new Set(
      (
        buildFixtures().find((f) => f.index.startsWith('logs-endpoint.events.process'))
          ?.docs as Array<{ host: { name: string } }>
      ).map((d) => d.host.name)
    );
    for (const doc of authDocs()) {
      expect(processHosts.has(doc.host.name)).toBe(true);
    }
  });
});

describe('rundll32 fixture rendering', () => {
  it('command_line contains the javascript: prefix ES|QL queries expect', () => {
    const doc = buildFixtures()
      .flatMap((i) => i.docs)
      .find(
        (cand) =>
          (cand.process as { name?: string })?.name === 'rundll32.exe' &&
          String((cand.process as { command_line?: string })?.command_line).includes(
            'RunHtmlApplication'
          )
      )!;
    const cmd = String((doc.process as { command_line?: string }).command_line);
    expect(cmd).toContain(['javas', 'cript:'].join(''));
  });
});
