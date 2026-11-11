/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core-http-browser';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { useKibana } from '../../hooks/use_kibana';
import { getHttpErrorStatus } from '../../common/http_error';

const FIND_RULES_PATH = '/internal/alerting/rules/_find';
const MAX_RULES = 1000;
const V2_PAGE_SIZE = 100;
const CLASSIC_UNAVAILABLE_STATUSES = [403];
const V2_UNAVAILABLE_STATUSES = [403, 404, 503];

export interface CatalogRule {
  name: string;
  tags: string[];
}

interface FindRulesResponse {
  data: CatalogRule[];
}

interface FindV2RulesResponse {
  items: Array<{ metadata: { name: string; tags?: string[] | null } }>;
  total: number;
}

const findRules = async (
  http: HttpSetup,
  signal: AbortSignal | undefined
): Promise<CatalogRule[]> => {
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
};

const findV2RulesPage = async (
  http: HttpSetup,
  signal: AbortSignal | undefined,
  page: number
): Promise<FindV2RulesResponse> =>
  http.get<FindV2RulesResponse>(ALERTING_V2_RULE_API_PATH, {
    query: {
      filter: 'kind: alert',
      sort_field: 'name',
      sort_order: 'asc',
      per_page: V2_PAGE_SIZE,
      page,
    },
    signal,
  });

const findV2Rules = async (
  http: HttpSetup,
  signal: AbortSignal | undefined
): Promise<CatalogRule[]> => {
  const rules: CatalogRule[] = [];
  for (let page = 1; rules.length < MAX_RULES; page++) {
    const response = await findV2RulesPage(http, signal, page);
    rules.push(
      ...response.items.map(({ metadata: { name, tags } }) => ({ name, tags: tags ?? [] }))
    );
    if (rules.length >= response.total || response.items.length < V2_PAGE_SIZE) break;
  }
  return rules;
};

const emptyWhenUnavailable = async (
  find: () => Promise<CatalogRule[]>,
  unavailableStatuses: number[]
): Promise<CatalogRule[]> => {
  try {
    return await find();
  } catch (error) {
    if (unavailableStatuses.includes(getHttpErrorStatus(error) ?? 0)) return [];
    throw error;
  }
};

export const useRuleCatalog = () => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['nightshift.ruleCatalog'],
    queryFn: async ({ signal }): Promise<CatalogRule[]> => {
      const [rules, v2Rules] = await Promise.all([
        emptyWhenUnavailable(() => findRules(http, signal), CLASSIC_UNAVAILABLE_STATUSES),
        emptyWhenUnavailable(() => findV2Rules(http, signal), V2_UNAVAILABLE_STATUSES),
      ]);
      return [...rules, ...v2Rules];
    },
  });
};
