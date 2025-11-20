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
  const hasGapFillStatuses =
    Array.isArray(query.gap_fill_statuses) && query.gap_fill_statuses.length > 0;
  if (hasGapFillStatuses) {
    if (query.gaps_range_start == null || query.gaps_range_end == null) {
      return [
        'when "gap_fill_statuses" is present, "gaps_range_start" and "gaps_range_end" must also be present',
      ];
    }
  }
  if (!hasGapFillStatuses && (query.gaps_range_start || query.gaps_range_end)) {
    return [
      'when "gap_fill_statuses" is not present, "gaps_range_start" and "gaps_range_end" must not be present',
    ];
  }
  return [];
};
