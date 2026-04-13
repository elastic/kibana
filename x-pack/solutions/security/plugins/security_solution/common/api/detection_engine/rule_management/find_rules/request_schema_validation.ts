/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesRequestQueryInput } from './find_rules_route.gen';

/**
 * Additional validation that is implemented outside of the schema itself.
 */
export const validateFindRulesRequestQuery = (query: FindRulesRequestQueryInput): string[] => {
  if (query.sort_order != null || query.sort_field != null) {
    if (query.sort_order == null || query.sort_field == null) {
      return ['when "sort_order" and "sort_field" must exist together or not at all'];
    }
  }
  const ruleExecutionGapQueryParamsSet = new Set([
    Array.isArray(query.gap_fill_statuses) && query.gap_fill_statuses.length > 0,
    Boolean(query.gaps_range_start),
    Boolean(query.gaps_range_end),
  ]);

  // All rule execution gap query params should be specified or omitted (set.size == 1)
  // return an error otherwise
  if (ruleExecutionGapQueryParamsSet.size > 1) {
    return [
      'Query fields "gap_fill_statuses", "gaps_range_start" and "gaps_range_end" has to be specified together',
    ];
  }
  return [];
};
