/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_QUERY_RULESET_RESPONSE_FIXTURE } from '../../common/__fixtures__/query_rules_ruleset';
import { fetchQueryRulesRuleset } from './fetch_query_rules_ruleset';
import { ElasticsearchClient } from '@kbn/core/server';

describe('fetch query rules rulesets lib function', () => {
  const mockClient = {
    queryRules: {
      getRuleset: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return query rules ruleset', async () => {
    mockClient.queryRules.getRuleset.mockResolvedValue(MOCK_QUERY_RULESET_RESPONSE_FIXTURE);

    const result = await fetchQueryRulesRuleset(client(), 'my-ruleset');
    expect(result).toEqual(MOCK_QUERY_RULESET_RESPONSE_FIXTURE);
  });
});
