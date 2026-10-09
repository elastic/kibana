/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateStatusOutcomes, type StatusOutcome } from './status_outcome';

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
