/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GranularRulesFacetCategory } from '../../../../common/api/detection_engine/rule_management';
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
  /** KQL of the filters that are not facets (rule state). */
  filter?: string;
  search?: string;
  categories?: GranularRulesFacetCategory[];
  enabled?: boolean;
}

/**
 * Counts for every facet in one request. The server counts each facet without its own selection,
 * so the other values of a facet stay visible with real numbers.
 */
export const useFacetCounts = ({
  conditions,
  scope,
  filter,
  search,
  categories = FACET_COUNT_CATEGORIES,
  enabled = true,
}: UseFacetCountsParams) =>
  useQuery(
    ['ruleFacetCounts', conditions, scope, filter, search, categories],
    async ({ signal }): Promise<FacetCountsResult & { total: number }> => {
      const response = await fetchSearchRules({
        fields: ['id'],
        pagination: { page: 1, perPage: 1 },
        ...(filter ? { filter: { term: filter, mode: 'KQL' as const } } : {}),
        ...(search ? { search: { term: search, mode: 'legacy' as const } } : {}),
        ...(scope ? { rule_scope: scope } : {}),
        ...(hasRuleSetConditions(conditions) ? { filter_params: conditions } : {}),
        aggregations: {
          counts: categories,
          exclude_own_filter: true,
          tag_categories: categories.includes('tags')
            ? Object.keys(conditions.tag_categories ?? {})
            : [],
        },
        signal,
      });
      return {
        total: response.total,
        counts: response.counts ?? {},
        tagCategoryCounts: response.tag_category_counts ?? {},
      };
    },
    { enabled, keepPreviousData: true, refetchOnWindowFocus: false }
  );
