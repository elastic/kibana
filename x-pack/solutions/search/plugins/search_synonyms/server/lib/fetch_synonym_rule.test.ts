/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { fetchSynonymRule } from './fetch_synonym_rule';

describe('fetch synonym rule lib function', () => {
  const mockClient = {
    synonyms: {
      getSynonymRule: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;
  it('should return synonym rule', async () => {
    mockClient.synonyms.getSynonymRule.mockResolvedValue({
      id: 'rule_id_1',
      synonyms: 'synonym1, synonym2',
    });

    const result = await fetchSynonymRule(client(), 'my_synonyms_set', 'rule_id_1');

    expect(result).toEqual({
      id: 'rule_id_1',
      synonyms: 'synonym1, synonym2',
    });
  });
});
