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
  if (query.gap_status != null) {
    if (query.gaps_range_start == null || query.gaps_range_end == null) {
      return [
        'when "gap_status" is present, "gaps_range_start" and "gaps_range_end" must also be present',
      ];
    }
  }
  if (!query.gap_status && (query.gaps_range_start || query.gaps_range_end)) {
    return [
      'when "gap_status" is not present, "gaps_range_start" and "gaps_range_end" must not be present',
    ];
  }
  return [];
};
