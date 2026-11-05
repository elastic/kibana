/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RELATED_ALERT_CASES } from '@kbn/evals-suite-alert-analysis-workflow';
import { buildCaseDocs } from './related_alert_docs';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

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
});
