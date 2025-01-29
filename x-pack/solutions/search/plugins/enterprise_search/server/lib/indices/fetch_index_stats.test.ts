/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { fetchIndexStats } from './fetch_index_stats';

describe('fetchIndexStats lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        stats: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  const indexStatsResponse = {
    indices: {
      'search-regular-index': {
        health: 'green',
        size: new ByteSizeValue(108000).toString(),
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: 108000,
          },
        },
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
      },
    },
  };

  it('returns stats from stats api with correct configuration', async () => {
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => indexStatsResponse);

    await expect(
      fetchIndexStats(mockClient as unknown as IScopedClusterClient, '*', ['open'])
    ).resolves.toEqual({
      ...indexStatsResponse.indices,
    });

    expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      index: '*',
      metric: ['docs', 'store'],
    });
  });

  it('returns empty object if response has no indices', async () => {
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => ({
      error: {
        index: 'indexName',
        index_uuid: '_na_',
        reason: 'no such index [indexName]',
        'resource.id': 'indexName',
        'resource.type': 'index_or_alias',
        root_cause: [
          {
            index: 'indexName',
            index_uuid: '_na_',
            reason: 'no such index [indexName]',
            'resource.id': 'indexName',
            'resource.type': 'index_or_alias',
            type: 'index_not_found_exception',
          },
        ],
        type: 'index_not_found_exception',
      },
      status: 404,
    }));

    await expect(
      fetchIndexStats(mockClient as unknown as IScopedClusterClient, '*', ['open'])
    ).resolves.toEqual({});
  });
});
