/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryRulesPutRulesetResponse,
  QueryRulesQueryRuleset,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const putRuleset = async (
  client: ElasticsearchClient,
  rulesetId: string,
  rules: QueryRulesQueryRuleset['rules']
): Promise<QueryRulesPutRulesetResponse> => {
  return client.queryRules.putRuleset({
    ruleset_id: rulesetId,
    rules,
  });
};
