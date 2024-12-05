/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fetchIndices } from './fetch_indices';

describe('fetch indices lib functions', () => {
  const mockClient = {
    indices: {
      get: jest.fn(),
      stats: jest.fn(),
    },
    security: {
      hasPrivileges: jest.fn(),
    },
    asInternalUser: {},
  };

  const regularIndexResponse = {
    'search-regular-index': {
      aliases: {},
    },
  };

  const regularIndexStatsResponse = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchIndices', () => {
    it('should return regular index', async () => {
      mockClient.indices.get.mockImplementation(() => ({
        ...regularIndexResponse,
      }));
      mockClient.indices.stats.mockImplementation(() => regularIndexStatsResponse);

      await expect(
        fetchIndices(mockClient as unknown as ElasticsearchClient, 0, 20, 'search')
      ).resolves.toEqual([{ count: 100, name: 'search-regular-index' }]);
      expect(mockClient.indices.get).toHaveBeenCalledWith({
        expand_wildcards: ['open'],
        features: ['aliases', 'settings'],
        index: '*search*',
      });

      expect(mockClient.indices.stats).toHaveBeenCalledWith({
        index: ['search-regular-index'],
        metric: ['docs'],
      });
    });

    it('should not return hidden indices', async () => {
      mockClient.indices.get.mockImplementation(() => ({
        ...regularIndexResponse,
        ['search-regular-index']: {
          ...regularIndexResponse['search-regular-index'],
          ...{ settings: { index: { hidden: 'true' } } },
        },
      }));
      mockClient.indices.stats.mockImplementation(() => regularIndexStatsResponse);

      await expect(
        fetchIndices(mockClient as unknown as ElasticsearchClient, 0, 20)
      ).resolves.toEqual([]);
      expect(mockClient.indices.get).toHaveBeenCalledWith({
        expand_wildcards: ['open'],
        features: ['aliases', 'settings'],
        index: '*',
      });

      expect(mockClient.indices.stats).not.toHaveBeenCalled();
    });

    it('should handle index missing in stats call', async () => {
      const missingStatsResponse = {
        indices: {
          some_other_index: { ...regularIndexStatsResponse.indices['search-regular-index'] },
        },
      };

      mockClient.indices.get.mockImplementationOnce(() => regularIndexResponse);
      mockClient.indices.stats.mockImplementationOnce(() => missingStatsResponse);
      // simulates when an index has been deleted after get indices call
      // deleted index won't be present in the indices stats call response
      await expect(
        fetchIndices(mockClient as unknown as ElasticsearchClient, 0, 20, 'search')
      ).resolves.toEqual([{ count: 0, name: 'search-regular-index' }]);
    });

    it('should return empty array when no index found', async () => {
      mockClient.indices.get.mockImplementationOnce(() => ({}));
      await expect(
        fetchIndices(mockClient as unknown as ElasticsearchClient, 0, 20, 'search')
      ).resolves.toEqual([]);
      expect(mockClient.indices.stats).not.toHaveBeenCalled();
    });
  });
});
