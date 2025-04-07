/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { fetchQueryRulesSets } from './fetch_query_rules_sets';

describe('fetch query rules sets lib function', () => {
  const mockClient = {
    security: {
      hasPrivileges: jest.fn(),
    },
    queryRules: {
      listRulesets: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return query rules sets', async () => {
    mockClient.queryRules.listRulesets.mockResolvedValue({
      count: 2,
      results: [
        {
          query_rule_set: 'my_query_rules_set',
          count: 2,
        },
        {
          query_rule_set: 'my_query_rules_set_2',
          count: 3,
        },
      ],
    });

    const result = await fetchQueryRulesSets(client(), { from: 0, size: 10 });
    expect(result).toEqual({
      _meta: {
        pageIndex: 0,
        pageSize: 10,
        totalItemCount: 2,
      },
      data: [
        {
          query_rule_set: 'my_query_rules_set',
          count: 2,
        },
        {
          query_rule_set: 'my_query_rules_set_2',
          count: 3,
        },
      ],
    });
  });
});
