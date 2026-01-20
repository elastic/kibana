/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoolQuery, Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { buildTimeRangeFilter } from '../helpers';

export interface AlertsGroupingFilterParams {
  /**
   * Default filters to apply to the query
   */
  defaultFilters: Filter[];
  /**
   * Global filters to apply to the query
   */
  globalFilters: Filter[];
  /**
   * Global KQL query to apply to the query
   */
  globalQuery: Query;
  /**
   * Optional parent grouping filter (stringified JSON array of filters)
   */
  parentGroupingFilter?: string;
  /**
   * Start time for the time range filter
   */
  from: string;
  /**
   * End time for the time range filter
   */
  to: string;
}

export interface AlertsGroupingFilterResult {
  /**
   * Filters in the format expected by getAlertsGroupingQuery (additionalFilters)
   * This is an array of { bool: BoolQuery } objects
   * Note: Does not include time range filter as getAlertsGroupingQuery adds it internally
   */
  additionalFilters: Array<{ bool: BoolQuery }>;
  /**
   * Filters in the format expected by ES|QL filter parameter
   * This is a BoolQuery that can be wrapped in { bool: ... } for ES|QL API
   * Note: Includes time range filter as ES|QL needs it in the filter parameter
   */
  boolQuery: BoolQuery;
}

/**
 * Builds filters for alerts grouping queries.
 * Returns filters in two formats:
 * 1. additionalFilters: Array<{ bool: BoolQuery }> - for use with getAlertsGroupingQuery (without time range)
 * 2. boolQuery: BoolQuery - for use with ES|QL filter parameter (with time range)
 *
 * Both formats include the same filter logic:
 * - Global KQL query
 * - Global filters (enabled only)
 * - Default filters
 * - Parent grouping filters (if provided)
 *
 * The difference is:
 * - additionalFilters: Does NOT include time range (getAlertsGroupingQuery adds it internally)
 * - boolQuery: Includes time range (ES|QL needs it in the filter parameter)
 *
 * @param params - Filter building parameters
 * @returns Object containing additionalFilters and boolQuery
 */
export const buildAlertsGroupingFilters = (
  params: AlertsGroupingFilterParams
): AlertsGroupingFilterResult => {
  const { defaultFilters, globalFilters, globalQuery, parentGroupingFilter, from, to } = params;

  try {
    // Combine all filters (excluding time range, which is added separately)
    const allFilters: Filter[] = [
      ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
      ...(defaultFilters ?? []),
      ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
    ];

    // Build additionalFilters format for getAlertsGroupingQuery
    // Note: getAlertsGroupingQuery adds time range filter internally, so we don't include it here
    // This uses buildEsQuery which returns { bool: BoolQuery }
    const additionalFilters: Array<{ bool: BoolQuery }> = [
      buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], allFilters),
    ];

    // Build boolQuery format for ES|QL filter parameter
    // ES|QL needs time range in the filter, so we include it here
    const boolQueryFromBuildEsQuery = additionalFilters[0].bool;

    // Add time range filter to boolQuery for ES|QL
    const timeRangeFilter = buildTimeRangeFilter(from, to);
    const timeRangeQuery = buildEsQuery(undefined, [], timeRangeFilter);

    // Combine boolQuery with time range for ES|QL
    const boolQuery: BoolQuery = {
      must: [...boolQueryFromBuildEsQuery.must, ...timeRangeQuery.bool.must],
      filter: [...boolQueryFromBuildEsQuery.filter, ...timeRangeQuery.bool.filter],
      should: [...boolQueryFromBuildEsQuery.should, ...timeRangeQuery.bool.should],
      must_not: [...boolQueryFromBuildEsQuery.must_not, ...timeRangeQuery.bool.must_not],
    };

    return {
      additionalFilters,
      boolQuery,
    };
  } catch (e) {
    // If filter building fails, return empty filters
    // This ensures the query still works even if filter conversion fails
    const emptyBoolQuery: BoolQuery = {
      must: [],
      filter: [],
      should: [],
      must_not: [],
    };

    return {
      additionalFilters: [{ bool: emptyBoolQuery }],
      boolQuery: emptyBoolQuery,
    };
  }
};
