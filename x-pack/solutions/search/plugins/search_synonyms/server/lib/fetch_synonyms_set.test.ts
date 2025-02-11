/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { fetchSynonymsSet } from './fetch_synonyms_set';

describe('fetch synonyms set lib function', () => {
  const mockClient = {
    synonyms: {
      getSynonym: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return synonym set', async () => {
    mockClient.synonyms.getSynonym.mockResolvedValue({
      synonyms_set: [
        {
          id: 'rule_id_1',
          synonyms: ['synonym1', 'synonym2'],
        },
      ],
      count: 2,
    });

    const result = await fetchSynonymsSet(client(), 'my_synonyms_set', { from: 0, size: 10 });

    expect(result).toEqual({
      _meta: {
        pageIndex: 0,
        pageSize: 10,
        totalItemCount: 2,
      },
      id: 'my_synonyms_set',
      data: [
        {
          id: 'rule_id_1',
          synonyms: ['synonym1', 'synonym2'],
        },
      ],
    });
  });
});
