/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { fetchIndexCounts } from './fetch_index_counts';

describe('fetchIndexCounts lib function', () => {
  const mockClient = {
    asCurrentUser: {
      count: jest.fn().mockReturnValue({ count: 100 }),
    },
  };

  it('returns count api response for each index name provided', async () => {
    const indexNames = ['index1', 'index2', 'index3'];

    await expect(
      fetchIndexCounts(mockClient as unknown as IScopedClusterClient, indexNames)
    ).resolves.toEqual({
      index1: 100,
      index2: 100,
      index3: 100,
    });
  });
});
