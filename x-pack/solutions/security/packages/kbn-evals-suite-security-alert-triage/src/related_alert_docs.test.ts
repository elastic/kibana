/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RELATED_ALERT_CASES as WORKFLOW_CASES } from '@kbn/evals-suite-alert-analysis-workflow';
import {
  TRIAGE_RELATED_ALERT_CASES as RELATED_ALERT_CASES,
  buildCaseDocs,
} from './related_alert_docs';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('TRIAGE_RELATED_ALERT_CASES', () => {
  it('excludes the id-only case, which the name-based tool cannot correlate, and keeps the rest', () => {
    const excluded = WORKFLOW_CASES.filter(
      ({ id }) => !RELATED_ALERT_CASES.some((testCase) => testCase.id === id)
    );
    expect(excluded.map(({ id }) => id)).toEqual(['related-malicious-id-only-control']);
    expect(RELATED_ALERT_CASES.map(({ id }) => id)).toEqual(
      WORKFLOW_CASES.slice(0, 4).map(({ id }) => id)
    );
  });
});

describe('buildCaseDocs', () => {
  it.each(RELATED_ALERT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    '%s: target first, related alerts newer than the default 24h window and older than the target',
    (_id, testCase) => {
      const docs = buildCaseDocs(testCase, 'run-1', NOW);
      expect(docs).toHaveLength(1 + testCase.related.length);
      expect(docs[0].id).toBe(`${testCase.id}-target-run-1`);

      const times = docs.map(({ doc }) => new Date(doc['@timestamp'] as string).getTime());
      times.forEach((time) => {
        expect(time).toBeLessThanOrEqual(NOW.getTime());
        expect(time).toBeGreaterThan(NOW.getTime() - DAY_MS);
      });
      times.slice(1).forEach((time) => expect(time).toBeLessThan(times[0]));
    }
  );

  it('gives every doc a unique id and one shared host.name and user.name per case', () => {
    RELATED_ALERT_CASES.forEach((testCase) => {
      const docs = buildCaseDocs(testCase, 'run-1', NOW);
      expect(new Set(docs.map(({ id }) => id)).size).toBe(docs.length);
      const hosts = new Set(docs.map(({ doc }) => (doc.host as { name: string }).name));
      const users = new Set(docs.map(({ doc }) => (doc.user as { name: string }).name));
      expect(hosts.size).toBe(1);
      expect(users.size).toBe(1);
    });
  });

  it('re-bases every time field so none keeps the fixture date', () => {
    const [{ doc }] = buildCaseDocs(RELATED_ALERT_CASES[0], 'run-1', NOW);
    ['kibana.alert.original_time', 'kibana.alert.start', 'event.created', 'event.ingested'].forEach(
      (field) => expect(doc[field]).toBe(doc['@timestamp'])
    );
    expect(String(doc['@timestamp'])).toMatch(/^2026-11-05T/);
  });

  it('keeps command lines on the nested process object for the related alerts', () => {
    const docs = buildCaseDocs(RELATED_ALERT_CASES[0], 'run-1', NOW);
    docs.forEach(({ doc }) =>
      expect((doc.process as { command_line?: string }).command_line).toEqual(expect.any(String))
    );
  });

  describe('per-run identity', () => {
    const names = (docs: ReturnType<typeof buildCaseDocs>) => ({
      hosts: new Set(docs.map(({ doc }) => (doc.host as { name: string }).name)),
      users: new Set(docs.map(({ doc }) => (doc.user as { name: string }).name)),
    });

    it.each(RELATED_ALERT_CASES.map((testCase) => [testCase.id, testCase] as const))(
      '%s: different run ids give different host.name and user.name, shared within a run',
      (_id, testCase) => {
        const first = names(buildCaseDocs(testCase, 'run-1', NOW));
        const second = names(buildCaseDocs(testCase, 'run-2', NOW));
        expect(first.hosts.size).toBe(1);
        expect(first.users.size).toBe(1);
        expect(second.hosts.size).toBe(1);
        expect(second.users.size).toBe(1);
        expect([...first.hosts][0]).not.toBe([...second.hosts][0]);
        expect([...first.users][0]).not.toBe([...second.users][0]);
      }
    );

    it('keeps ordinary-looking names and rewrites the user name embedded in paths and command lines', () => {
      const malicious = RELATED_ALERT_CASES.find(({ id }) => id === 'related-malicious-control')!;
      const docs = buildCaseDocs(malicious, 'run-1', NOW);
      const { hosts, users } = names(docs);
      const [host] = [...hosts];
      const [user] = [...users];
      expect(host).toMatch(/^jdoe-mbp-[0-9a-f]{6}$/);
      expect(user).toMatch(/^jdoe\d{6}$/);

      const serialised = JSON.stringify(docs.map(({ doc }) => doc));
      expect(serialised).toContain(`/Users/${user}/`);
      expect(serialised).not.toContain('/Users/jdoe/');
      docs.forEach(({ doc }) => {
        expect((doc.host as { hostname: string }).hostname).toBe(host);
      });
    });

    it('gives a hyphenated user name the same numeric suffix shape', () => {
      const windows = RELATED_ALERT_CASES.find(
        ({ id }) => id === 'related-lolbin-procdump-control'
      )!;
      const { users } = names(buildCaseDocs(windows, 'run-1', NOW));
      expect([...users][0]).toMatch(/^svc-backup\d{6}$/);
    });

    it('defaults the clock to now', () => {
      const [{ doc }] = buildCaseDocs(RELATED_ALERT_CASES[0], 'run-1');
      const age = Date.now() - new Date(doc['@timestamp'] as string).getTime();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(DAY_MS);
    });

    it('does not let a run match the alerts of another run of the same case', () => {
      const benign = RELATED_ALERT_CASES[0];
      const control = RELATED_ALERT_CASES[1];
      const leaked = names(buildCaseDocs(control, 'run-1', NOW));
      const next = names(buildCaseDocs(benign, 'run-2', NOW));
      expect([...next.hosts][0]).not.toBe([...leaked.hosts][0]);
      expect([...next.users][0]).not.toBe([...leaked.users][0]);
    });
  });
});
