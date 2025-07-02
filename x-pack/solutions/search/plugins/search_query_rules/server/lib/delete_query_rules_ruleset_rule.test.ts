/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { deleteRulesetRule } from './delete_query_rules_ruleset_rule';

describe('delete ruleset rule lib function', () => {
  const mockClient = {
    queryRules: {
      deleteRule: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;
  it('should delete ruleset', async () => {
    mockClient.queryRules.deleteRule.mockResolvedValue({});

    await deleteRulesetRule(client(), 'my_ruleset', 'my_rule');

    expect(mockClient.queryRules.deleteRule).toHaveBeenCalledWith({
      ruleset_id: 'my_ruleset',
      rule_id: 'my_rule',
    });
  });
});
