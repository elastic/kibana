/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRulesQueryRule, QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { SearchQueryRulesQueryRule } from '../types';

export const fetchQueryRulesQueryRule = async (
  client: ElasticsearchClient,
  rulesetId: QueryRulesQueryRuleset['ruleset_id'],
  ruleId: QueryRulesQueryRule['rule_id']
): Promise<SearchQueryRulesQueryRule> => {
  const result = await client.queryRules.getRule({
    ruleset_id: rulesetId,
    rule_id: ruleId,
  });

  return {
    ...result,
    criteria: !Array.isArray(result.criteria) ? [result.criteria] : result.criteria,
  };
};
