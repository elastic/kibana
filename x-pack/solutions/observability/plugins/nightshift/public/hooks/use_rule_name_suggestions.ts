/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

const FIND_RULES_PATH = '/internal/alerting/rules/_find';
const MAX_SUGGESTIONS = 20;

const escapeSearchOperators = (text: string) => text.replace(/[+|"*()~\\-]/g, '\\$&');

interface FindRulesResponse {
  data: Array<{ name: string }>;
}

export const useRuleNameSuggestions = (search: string) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['nightshift.ruleNameSuggestions', search],
    queryFn: async ({ signal }): Promise<string[]> => {
      const { data } = await http.post<FindRulesResponse>(FIND_RULES_PATH, {
        body: JSON.stringify({
          search: search ? `${escapeSearchOperators(search)}*` : undefined,
          search_fields: ['name'],
          default_search_operator: 'AND',
          per_page: MAX_SUGGESTIONS,
          fields: ['name'],
        }),
        signal,
      });
      return [...new Set(data.map(({ name }) => name))];
    },
    keepPreviousData: true,
  });
};
