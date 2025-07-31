/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

export const useGenerateRuleId = (rulesetId: string) => {
  const {
    services: { http },
  } = useKibana();

  return useMutation<string>({
    mutationFn: async () => {
      const response = await http.post<{ ruleId: string }>(
        `/internal/search_query_rules/ruleset/${rulesetId}/generate_rule_id`
      );
      return response.ruleId;
    },
    retry: false,
  });
};
