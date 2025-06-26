/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { fetchSynonymSets } from './fetch_synonym_sets';

describe('fetch synonym sets lib function', () => {
  const mockClient = {
    security: {
      hasPrivileges: jest.fn(),
    },
    synonyms: {
      getSynonymsSets: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return synonym sets', async () => {
    mockClient.synonyms.getSynonymsSets.mockResolvedValue({
      count: 2,
      results: [
        {
          synonyms_set: 'my_synonyms_set',
          count: 2,
        },
        {
          synonyms_set: 'my_synonyms_set_2',
          count: 3,
        },
      ],
    });

    const result = await fetchSynonymSets(client(), { from: 0, size: 10 });
    expect(result).toEqual({
      _meta: {
        pageIndex: 0,
        pageSize: 10,
        totalItemCount: 2,
      },
      data: [
        {
          synonyms_set: 'my_synonyms_set',
          count: 2,
        },
        {
          synonyms_set: 'my_synonyms_set_2',
          count: 3,
        },
      ],
    });
  });
});
