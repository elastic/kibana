/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  aggregateStatusOutcomes,
  nextStatus,
  RECOVERING_COUNT,
  type LiveStatus,
  type StatusOutcome,
} from './status_transition';

describe('nextStatus', () => {
  const N = RECOVERING_COUNT;

  it('spends N evaluations in recovering and resolves on evaluation N+1 of consecutive clean runs', () => {
    let current: LiveStatus = 'active';
    let statusCount = 0;
    const written: string[] = [];

    for (let evaluation = 1; evaluation <= N + 1; evaluation++) {
      const next = nextStatus({ current, outcome: 'clean', statusCount });
      written.push(next.status);
      if (next.status === 'inactive') {
        break;
      }
      statusCount = next.status === 'recovering' ? statusCount + 1 : 0;
      current = next.status as LiveStatus;
    }

    expect(written).toEqual([...Array(N).fill('recovering'), 'inactive']);
  });

  it('honours a custom recovering count', () => {
    expect(
      nextStatus({ current: 'recovering', outcome: 'clean', statusCount: 1, recoveringCount: 1 })
    ).toEqual({ status: 'inactive', write: true });
    expect(
      nextStatus({ current: 'recovering', outcome: 'clean', statusCount: 1, recoveringCount: 2 })
    ).toEqual({ status: 'recovering', write: true });
  });
});

describe('aggregateStatusOutcomes', () => {
  it.each<[StatusOutcome[], StatusOutcome]>([
    [['clean'], 'clean'],
    [['clean', 'clean'], 'clean'],
    [['breaching'], 'breaching'],
    [['clean', 'breaching'], 'breaching'],
    [['no_data', 'breaching'], 'breaching'],
    [['clean', 'no_data'], 'no_data'],
    [['no_data'], 'no_data'],
    [[], 'no_data'],
  ])('%j -> %s', (outcomes, expected) => {
    expect(aggregateStatusOutcomes(outcomes)).toBe(expected);
  });
});
