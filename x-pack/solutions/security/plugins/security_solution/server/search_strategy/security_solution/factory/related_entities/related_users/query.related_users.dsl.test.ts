/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelatedUsersQuery } from './query.related_users.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

describe('buildRelatedUsersQuery', () => {
  test('build query from options correctly', () => {
    const result = buildRelatedUsersQuery(mockOptions);
    expect(result).toMatchObject({
      allow_no_indices: expectedDsl.allow_no_indices,
      track_total_hits: expectedDsl.track_total_hits,
      aggregations: expectedDsl.aggregations,
      size: expectedDsl.size,
      ignore_unavailable: expectedDsl.ignore_unavailable,
      index: expectedDsl.index,
    });
    expect(result.query?.bool?.filter).toEqual(
      expect.arrayContaining([
        { term: { 'event.category': 'authentication' } },
        { term: { 'event.outcome': 'success' } },
      ])
    );
    const filter = result.query?.bool?.filter;
    expect(Array.isArray(filter)).toBe(true);
    expect(Array.isArray(filter) ? filter.length : 0).toBeGreaterThanOrEqual(3);
  });
});
