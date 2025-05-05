/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRulesPutRulesetResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const putRuleset = async (
  client: ElasticsearchClient,
  rulesetId: string
): Promise<QueryRulesPutRulesetResponse> => {
  return client.queryRules.putRuleset({
    ruleset_id: rulesetId,
    rules: [
      {
        rule_id: 'rule1',
        type: 'pinned',
        criteria: [
          {
            type: 'fuzzy',
            metadata: 'query_string',
            values: ['puggles', 'pugs'],
          },
        ],
        actions: {
          docs: [
            {
              _index: 'my-index-000001',
              _id: 'id1',
            },
          ],
        },
      },
    ],
  });
};
