/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduceAnomaliesByTactic } from './anomalies';
import { createTestLookup } from './test_helpers';

describe('reduceAnomaliesByTactic', () => {
  it('spreads job counts over the tactics each job maps to, by id or name', () => {
    const byTactic = reduceAnomaliesByTactic(
      [
        { key: 'job-a', doc_count: 3 },
        { key: 'job-b', doc_count: 2 },
        { key: 'job-no-tactics', doc_count: 9 },
      ],
      new Map([
        ['job-a', ['Lateral Movement', 'Discovery']],
        ['job-b', ['TA0008', 'Defense Evasion']],
        ['job-no-tactics', []],
      ]),
      createTestLookup()
    );
    expect(Object.fromEntries(byTactic)).toEqual({ TA0008: 5, TA0007: 3, TA0005: 2 });
  });

  it('does not double count a job that maps to the same tactic twice', () => {
    const byTactic = reduceAnomaliesByTactic(
      [{ key: 'job-a', doc_count: 4 }],
      new Map([['job-a', ['Defense Evasion', 'Stealth']]]),
      createTestLookup()
    );
    expect(byTactic.get('TA0005')).toBe(4);
  });
});
