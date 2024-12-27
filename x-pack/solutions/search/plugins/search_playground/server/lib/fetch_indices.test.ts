/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { fetchIndices } from './fetch_indices';

describe('fetch indices', () => {
  const mockIndexResponse = {
    'index-1': {
      aliases: {
        'search-alias-1': {},
        'search-alias-2': {},
      },
    },
    'index-2': {
      aliases: {
        'search-alias-3': {},
        'search-alias-4': {},
      },
    },
    'index-3': {
      aliases: {
        'search-alias-1': {},
        'search-alias-2': {},
      },
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const mockClient = {
    asCurrentUser: { indices: { get: jest.fn() } },
  };

  it('returns index data with for non-hidden indices', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => {
      return mockIndexResponse;
    });

    const indexData = await fetchIndices(
      mockClient.asCurrentUser as unknown as ElasticsearchClient,
      undefined
    );

    expect(indexData).toEqual({
      indexNames: [
        'index-1',
        'index-2',
        'index-3',
        'search-alias-1',
        'search-alias-2',
        'search-alias-3',
        'search-alias-4',
      ],
    });
  });
});
