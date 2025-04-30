/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { deleteSynonymRule } from './delete_synonym_rule';

describe('delete synonym rule lib function', () => {
  const mockClient = {
    synonyms: {
      deleteSynonymRule: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;
  it('should delete synonym rule', async () => {
    mockClient.synonyms.deleteSynonymRule.mockResolvedValue({});

    await deleteSynonymRule(client(), 'my_synonyms_set', 'rule_id_1');

    expect(mockClient.synonyms.deleteSynonymRule).toHaveBeenCalledWith({
      rule_id: 'rule_id_1',
      set_id: 'my_synonyms_set',
    });
  });
});
