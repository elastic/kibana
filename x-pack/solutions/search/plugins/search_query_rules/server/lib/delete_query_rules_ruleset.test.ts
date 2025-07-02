/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { deleteRuleset } from './delete_query_rules_ruleset';

describe('delete ruleset lib function', () => {
  const mockClient = {
    queryRules: {
      deleteRuleset: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;
  it('should delete ruleset', async () => {
    mockClient.queryRules.deleteRuleset.mockResolvedValue({});

    await deleteRuleset(client(), 'my_ruleset');

    expect(mockClient.queryRules.deleteRuleset).toHaveBeenCalledWith({
      ruleset_id: 'my_ruleset',
    });
  });
});
