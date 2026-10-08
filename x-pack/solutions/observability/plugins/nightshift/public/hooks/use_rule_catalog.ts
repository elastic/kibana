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
const MAX_RULES = 1000;

export interface CatalogRule {
  name: string;
  tags: string[];
}

interface FindRulesResponse {
  data: CatalogRule[];
}

export const useRuleCatalog = () => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['nightshift.ruleCatalog'],
    queryFn: async ({ signal }): Promise<CatalogRule[]> => {
      const { data } = await http.post<FindRulesResponse>(FIND_RULES_PATH, {
        body: JSON.stringify({
          rule_type_ids: OBSERVABILITY_RULE_TYPE_IDS,
          sort_field: 'name',
          sort_order: 'asc',
          per_page: MAX_RULES,
          fields: ['name', 'tags'],
        }),
        signal,
      });
      return data.map(({ name, tags }) => ({ name, tags }));
    },
  });
};
