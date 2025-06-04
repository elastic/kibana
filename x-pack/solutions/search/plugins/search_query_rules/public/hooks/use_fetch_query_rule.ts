/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRulesQueryRule, QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { useQuery } from '@tanstack/react-query';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { QUERY_RULES_QUERY_RULE_FETCH_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';
import { SearchQueryRulesQueryRule } from '../types';

export const useFetchQueryRule = (
  rulesetId: QueryRulesQueryRuleset['ruleset_id'],
  ruleId: QueryRulesQueryRule['rule_id']
) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery<SearchQueryRulesQueryRule, { body: KibanaServerError }>({
    queryKey: [QUERY_RULES_QUERY_RULE_FETCH_KEY, ruleId],
    queryFn: async () => {
      return await http.get<SearchQueryRulesQueryRule>(
        `/internal/search_query_rules/ruleset/${rulesetId}/rule/${ruleId}`
      );
    },
  });
};
