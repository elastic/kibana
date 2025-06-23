/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { QUERY_RULES_QUERY_RULESET_EXISTS_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useFetchQueryRulesetExist = (
  rulesetId: string,
  onNoConflict?: () => void,
  onConflict?: () => void
) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery<boolean, { body: KibanaServerError }>({
    queryKey: [QUERY_RULES_QUERY_RULESET_EXISTS_KEY, rulesetId],
    queryFn: async () => {
      const { exists } = await http.get<{ exists: boolean }>(
        `/internal/search_query_rules/ruleset/${rulesetId}/exists`
      );
      if (!exists && onNoConflict) {
        onNoConflict();
      }
      if (exists && onConflict) {
        onConflict();
      }

      return exists;
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!rulesetId,
  });
};
