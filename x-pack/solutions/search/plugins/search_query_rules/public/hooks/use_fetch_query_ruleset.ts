/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { QUERY_RULES_QUERY_RULESET_FETCH_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useFetchQueryRuleset = (rulesetId: string, enabled = true) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery<QueryRulesQueryRuleset, { body: KibanaServerError }>({
    queryKey: [QUERY_RULES_QUERY_RULESET_FETCH_KEY, rulesetId],
    queryFn: async () => {
      return await http.get<QueryRulesQueryRuleset>(
        `/internal/search_query_rules/ruleset/${rulesetId}`
      );
    },
    retry: false,
    enabled,
  });
};
