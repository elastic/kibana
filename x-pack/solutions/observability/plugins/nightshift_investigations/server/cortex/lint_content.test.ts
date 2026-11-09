/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lintCortexContent } from './lint_content';

const rulesOf = (text: string) => lintCortexContent(text).map(({ rule }) => rule);

describe('lintCortexContent', () => {
  it.each([
    ['an ISO date', 'Started on 2026-08-18 for the project.', 'iso_timestamp'],
    ['an ISO timestamp', 'Seen at 2026-08-18T07:20:32Z in the logs.', 'iso_timestamp'],
    ['a clock time with a zone', 'The gap ran until 07:34 UTC.', 'clock_time'],
    ['a UUID', 'Trace 3f90992e-1b81-4f58-9a2c-0d5e6f7a8b9c failed.', 'uuid'],
    ['a long hex id', 'Run 45440287bd44aa9addfa424be71a4f0f was slow.', 'long_hex_id'],
    ['a relative time', 'The service is currently unavailable.', 'relative_time'],
    ['a count of events seen', 'It logged 5,944 errors on one node.', 'counted_quantity'],
  ])('flags %s', (_name, text, rule) => {
    expect(rulesOf(text)).toContain(rule);
  });

  it('accepts durable structure and configured limits', () => {
    const clean = [
      '## Dependencies',
      'Project creation depends on the DNS publisher (`external-dns`) to publish records.',
      '## Observability',
      'Group by `container.image.name` and `agent.version` before and during the onset.',
      'Queries over a wide window can exceed the 120s curl limit; narrow the window and retry.',
      'The memory limit is 128 MB; compare restarts with logged exit lines.',
    ].join('\n');

    expect(lintCortexContent(clean)).toEqual([]);
  });

  it.each(['403 errors on registration', 'a burst of 503 errors', 'returns 429 error responses'])(
    'does not read an HTTP status code as a count of errors: %s',
    (text) => {
      expect(lintCortexContent(text)).toEqual([]);
    }
  );

  it.each(['5,944 errors', '1,403 errors', '250 errors', '23 restarts', '12 retries'])(
    'still flags a count of events that merely contains digits like a status: %s',
    (text) => {
      expect(rulesOf(text)).toEqual(['counted_quantity']);
    }
  );

  it.each(['32 pods', 'about 9 pods', '3 nodes', '6 replicas', '2 instances'])(
    'reports how many instances run without blocking: %s',
    (text) => {
      expect(lintCortexContent(text)).toEqual([
        expect.objectContaining({ rule: 'replica_count', blocking: false }),
      ]);
    }
  );

  it.each([
    'It logged 5,944 errors on one node.',
    'The client gives up after 3 retries.',
    'Bulk requests carry 1000 documents per batch.',
    'The API says "The requested resource is currently unavailable".',
    'Check the logs from the last hour before onset.',
  ])('reports a count or a relative time without blocking: %s', (text) => {
    const violations = lintCortexContent(text);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every(({ blocking }) => !blocking)).toBe(true);
  });

  it('blocks only what names a date, a time or an id', () => {
    const violations = lintCortexContent(
      'On 2026-08-18 at 07:20 UTC, run 45440287bd44aa9addfa424be71a4f0f, trace 3f90992e-1b81-4f58-9a2c-0d5e6f7a8b9c.'
    );

    expect(violations.map(({ rule }) => rule)).toEqual([
      'iso_timestamp',
      'clock_time',
      'uuid',
      'long_hex_id',
    ]);
    expect(violations.every(({ blocking }) => blocking)).toBe(true);
  });

  it('does not treat a short word of hex letters as an id', () => {
    expect(lintCortexContent('Use the deadbeef marker only in tests.')).toEqual([]);
  });

  it('reports each occurrence with its text', () => {
    const violations = lintCortexContent('On 2026-08-18 and 2026-08-19 it failed.');

    expect(violations.map(({ match }) => match)).toEqual(['2026-08-18', '2026-08-19']);
  });
});
