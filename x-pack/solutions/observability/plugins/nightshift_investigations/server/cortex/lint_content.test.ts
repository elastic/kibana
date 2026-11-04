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

  it('does not treat a short word of hex letters as an id', () => {
    expect(lintCortexContent('Use the deadbeef marker only in tests.')).toEqual([]);
  });

  it('reports each occurrence with its text', () => {
    const violations = lintCortexContent('On 2026-08-18 and 2026-08-19 it failed.');

    expect(violations.map(({ match }) => match)).toEqual(['2026-08-18', '2026-08-19']);
  });
});
