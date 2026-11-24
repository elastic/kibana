/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type {
  RuleScope,
  RuleSetConditions,
} from '../../../../common/api/detection_engine/rule_sets';
import { hasRuleSetConditions } from '../../../../common/detection_engine/rule_sets/rule_set_conditions';
import { fetchSearchRules } from '../../rule_management/api/api';
import type { FacetCountsResult } from './facet_fields';
import { FACET_COUNT_CATEGORIES } from './facet_fields';

interface UseFacetCountsParams {
  conditions: RuleSetConditions;
  /** The rule set of the page, if any: counts are counts inside the set. */
  scope?: RuleScope;
  /** KQL of the filters that are not facets. */
  filter?: string;
  search?: string;
  enabled?: boolean;
}

type FacetCountsData = FacetCountsResult & { total: number };

/**
 * Counts for every facet in one request. The server counts each facet without its own selection,
 * so the other values of a facet stay visible with real numbers.
 */
export const useFacetCounts = ({
  conditions,
  scope,
  filter,
  search,
  enabled = true,
}: UseFacetCountsParams) => {
  const scopeKey = JSON.stringify(scope ?? null);
  const last = useRef<{ scopeKey: string; data: FacetCountsData }>();
  return useQuery(
    ['ruleFacetCounts', conditions, scope, filter, search],
    async ({ signal }): Promise<FacetCountsData> => {
      const response = await fetchSearchRules({
        fields: ['id'],
        pagination: { page: 1, perPage: 1 },
        ...(filter ? { filter: { term: filter, mode: 'KQL' as const } } : {}),
        ...(search ? { search: { term: search, mode: 'legacy' as const } } : {}),
        ...(scope ? { rule_scope: scope } : {}),
        ...(hasRuleSetConditions(conditions) ? { filter_params: conditions } : {}),
        aggregations: {
          counts: FACET_COUNT_CATEGORIES,
          exclude_own_filter: true,
          tag_categories: Object.keys(conditions.tag_categories ?? {}),
        },
        signal,
      });
      return {
        total: response.total,
        counts: response.counts ?? {},
        tagCategoryCounts: response.tag_category_counts ?? {},
      };
    },
    {
      enabled,
      refetchOnWindowFocus: false,
      // The old counts stay while new ones load, but only inside the same scope: counts of another
      // rule set would put values into the facets that the set does not have.
      placeholderData: () => (last.current?.scopeKey === scopeKey ? last.current.data : undefined),
      onSuccess: (data) => {
        last.current = { scopeKey, data };
      },
    }
  );
};
