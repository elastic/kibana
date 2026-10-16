/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partitionClassificationResults } from './classification_completeness';

const candidates = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('partitionClassificationResults', () => {
  it('resolves every candidate when each has exactly 1 result', () => {
    expect(
      partitionClassificationResults(candidates, [
        { id: 'c', keep: true },
        { id: 'a', keep: false },
        { id: 'b', keep: true },
      ])
    ).toEqual({
      results: [
        { id: 'a', keep: false },
        { id: 'b', keep: true },
        { id: 'c', keep: true },
      ],
      unresolvedIds: [],
    });
  });

  it('reports omitted and conflicting duplicate candidates and ignores unknown IDs', () => {
    expect(
      partitionClassificationResults(candidates, [
        { id: 'a', keep: true },
        { id: 'b', keep: true },
        { id: 'b', keep: false },
        { id: 'unknown', keep: true },
      ])
    ).toEqual({ results: [{ id: 'a', keep: true }], unresolvedIds: ['b', 'c'] });
  });

  it('keeps 1 copy of duplicate results that agree', () => {
    expect(
      partitionClassificationResults(candidates, [
        { id: 'a', keep: true, level: 'info' },
        { level: 'info', keep: true, id: 'a' },
        { id: 'b', keep: false },
        { id: 'c', keep: true, level: 'info' },
        { id: 'c', keep: true },
      ])
    ).toEqual({
      results: [
        { id: 'a', keep: true, level: 'info' },
        { id: 'b', keep: false },
      ],
      unresolvedIds: ['c'],
    });
  });
});
