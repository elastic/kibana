/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertCountsFor, runMatchers, summarizeCoverage } from './run_matchers';
import type { SourceOutcome } from './run_matchers';
import type { AlertMatcher } from './types';

const matcherReturning = (
  source: AlertMatcher['source'],
  alertIdsByEntity: Array<[string, string[]]>,
  activeAlerts: number
): AlertMatcher => ({
  source,
  match: async () => ({
    source,
    alertIdsByEntity: new Map(alertIdsByEntity.map(([id, ids]) => [id, new Set(ids)])),
    activeAlerts,
  }),
});

const failingMatcher = (source: AlertMatcher['source'], message: string): AlertMatcher => ({
  source,
  match: async () => {
    throw new Error(message);
  },
});

describe('runMatchers', () => {
  it('keeps the result of a source when another one fails', async () => {
    const outcomes = await runMatchers(
      [
        matcherReturning('classic', [['e1', ['a1']]], 4),
        failingMatcher('v2', 'index_not_found_exception: no such index [.rule-events]'),
      ],
      { keys: [], entities: [] }
    );

    expect(outcomes[0].result?.activeAlerts).toBe(4);
    expect(outcomes[1]).toEqual({
      source: 'v2',
      error: 'index_not_found_exception: no such index [.rule-events]',
    });
  });

  it('shortens a long error message', async () => {
    const [outcome] = await runMatchers([failingMatcher('v2', 'x'.repeat(1000))], {
      keys: [],
      entities: [],
    });

    expect(outcome.error).toHaveLength(300);
  });
});

describe('alertCountsFor and summarizeCoverage', () => {
  const outcomes: SourceOutcome[] = [
    {
      source: 'classic',
      result: {
        source: 'classic',
        alertIdsByEntity: new Map([
          ['e1', new Set(['a1', 'a2'])],
          ['e2', new Set(['a2'])],
        ]),
        activeAlerts: 6,
      },
    },
    {
      source: 'v2',
      result: {
        source: 'v2',
        alertIdsByEntity: new Map([['e1', new Set(['b1'])]]),
        activeAlerts: 3,
      },
    },
  ];

  it('gives the count per source and their sum', () => {
    expect(alertCountsFor(outcomes, 'e1')).toEqual({ classic: 2, v2: 1, total: 3 });
    expect(alertCountsFor(outcomes, 'e2')).toEqual({ classic: 1, v2: 0, total: 1 });
    expect(alertCountsFor(outcomes, 'e9')).toEqual({ classic: 0, v2: 0, total: 0 });
  });

  it('counts a failed source as zero and reports its error in the coverage', () => {
    const failed: SourceOutcome[] = [outcomes[0], { source: 'v2', error: 'boom' }];

    expect(alertCountsFor(failed, 'e1')).toEqual({ classic: 2, v2: 0, total: 2 });
    expect(summarizeCoverage(failed)).toEqual({
      classic: { activeAlerts: 6, matchedAlerts: 2 },
      v2: { error: 'boom' },
    });
  });

  it('counts a matched alert once however many entities claim it', () => {
    expect(summarizeCoverage(outcomes).classic).toEqual({ activeAlerts: 6, matchedAlerts: 2 });
    expect(summarizeCoverage(outcomes).v2).toEqual({ activeAlerts: 3, matchedAlerts: 1 });
  });
});
