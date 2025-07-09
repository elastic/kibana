/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchIndices', () => {
    it('should return regular index', async () => {
      mockClient.indices.get.mockImplementation(() => ({
        ...regularIndexResponse,
      }));

      await expect(
        fetchIndices(mockClient as unknown as ElasticsearchClient, 0, 20, 'search')
      ).resolves.toEqual([{ name: 'search-regular-index' }]);
      expect(mockClient.indices.get).toHaveBeenCalledWith({
        expand_wildcards: ['open'],
        features: ['aliases', 'settings'],
        index: '*search*',
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

      await expect(
        fetchIndices(mockClient as unknown as ElasticsearchClient, 0, 20)
      ).resolves.toEqual([]);
      expect(mockClient.indices.get).toHaveBeenCalledWith({
        expand_wildcards: ['open'],
        features: ['aliases', 'settings'],
        index: '*',
      });
    });

    it('should return empty array when no index found', async () => {
      mockClient.indices.get.mockImplementationOnce(() => ({}));
      await expect(
        fetchIndices(mockClient as unknown as ElasticsearchClient, 0, 20, 'search')
      ).resolves.toEqual([]);
    });
  });
});
