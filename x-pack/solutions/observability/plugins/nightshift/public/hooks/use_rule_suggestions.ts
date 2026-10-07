/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { useKibana } from './use_kibana';

const FIND_RULES_PATH = '/internal/alerting/rules/_find';
const MAX_SUGGESTIONS = 50;

const escapeSearchOperators = (text: string) => text.replace(/[+|"*()~\\-]/g, '\\$&');
const escapeKqlValue = (text: string) => text.replace(/[\\"]/g, '\\$&');

export interface RuleSuggestion {
  name: string;
  tags: string[];
}

interface FindRulesResponse {
  data: RuleSuggestion[];
  total: number;
}

export const useRuleSuggestions = (search: string, tag: string) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['nightshift.ruleSuggestions', search, tag],
    queryFn: async ({ signal }): Promise<{ rules: RuleSuggestion[]; total: number }> => {
      const { data, total } = await http.post<FindRulesResponse>(FIND_RULES_PATH, {
        body: JSON.stringify({
          search: search ? `${escapeSearchOperators(search)}*` : undefined,
          rule_type_ids: OBSERVABILITY_RULE_TYPE_IDS,
          search_fields: ['name', 'tags'],
          default_search_operator: 'AND',
          filter: tag ? `alert.attributes.tags: "${escapeKqlValue(tag)}"` : undefined,
          per_page: MAX_SUGGESTIONS,
          fields: ['name', 'tags'],
        }),
        signal,
      });
      return { rules: data.map(({ name, tags }) => ({ name, tags })), total };
    },
    keepPreviousData: true,
  });
};
