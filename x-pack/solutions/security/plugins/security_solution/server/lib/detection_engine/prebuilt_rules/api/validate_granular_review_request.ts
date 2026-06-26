/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesFilter } from '../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import {
  MAX_SEARCH_RULES_SEARCH_TERM_LENGTH,
  validateAggregationsCountsUnique,
  validateSearchRulesFilter,
} from '../../rule_management/api/rules/search_rules/request_schema_validation';

interface GranularReviewRequestBody {
  filter?: GranularRulesFilter;
  search?: { term: string; mode?: string };
  aggregations?: { counts?: string[] };
}

export const validateGranularReviewRequestBody = (body: GranularReviewRequestBody): string[] => {
  const errors: string[] = [];

  if (body.search != null && body.search.term.length > MAX_SEARCH_RULES_SEARCH_TERM_LENGTH) {
    errors.push(`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`);
  }

  errors.push(...validateSearchRulesFilter(body.filter));
  errors.push(...validateAggregationsCountsUnique(body.aggregations));

  const searchMode = body.search?.mode;
  if (searchMode != null && searchMode !== 'legacy') {
    errors.push(`unsupported search.mode "${searchMode}"`);
  }

  return errors;
};
