/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_SEARCH_RULES_SEARCH_TERM_LENGTH,
  validateSearchRulesKqlFilter,
} from '../../rule_management/search_rules/request_schema_validation';
import type { ReviewRuleInstallationRequestBodyInput } from './review_rule_installation_route';

const validateSortFieldAndOrderCoexist = (
  body: ReviewRuleInstallationRequestBodyInput
): string[] => {
  const hasField = body.sort_field != null;
  const hasOrder = body.sort_order != null;
  if (hasField !== hasOrder) {
    return ['sort_field and sort_order must be provided together'];
  }
  return [];
};

const validateSearchAfterRequiresSort = (
  body: ReviewRuleInstallationRequestBodyInput
): string[] => {
  const searchAfter = body.search_after;
  if (searchAfter == null || searchAfter.length === 0) {
    return [];
  }
  if (body.sort_field == null || body.sort_order == null) {
    return ['when search_after is provided, sort_field and sort_order must be set'];
  }
  return [];
};

const validateAggregationsCountsUnique = (
  aggregations: ReviewRuleInstallationRequestBodyInput['aggregations']
): string[] => {
  const counts = aggregations?.counts;
  if (counts == null || counts.length === 0) {
    return [];
  }
  if (new Set(counts).size !== counts.length) {
    return ['aggregations.counts must not contain duplicate facet categories'];
  }
  return [];
};

const validateSearchMode = (search: ReviewRuleInstallationRequestBodyInput['search']): string[] => {
  const searchMode = search?.mode;
  if (searchMode != null && searchMode !== 'legacy') {
    return [`unsupported search.mode "${searchMode}"`];
  }
  return [];
};

const validateSearchTermLength = (
  search: ReviewRuleInstallationRequestBodyInput['search']
): string[] => {
  if (search?.term != null && search.term.length > MAX_SEARCH_RULES_SEARCH_TERM_LENGTH) {
    return [`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`];
  }
  return [];
};

export const validateReviewRuleInstallationRequestBody = (
  body: ReviewRuleInstallationRequestBodyInput
): string[] => {
  const errors: string[] = [];
  errors.push(...validateSearchRulesKqlFilter(body.filter));
  errors.push(...validateSortFieldAndOrderCoexist(body));
  errors.push(...validateSearchAfterRequiresSort(body));
  errors.push(...validateAggregationsCountsUnique(body.aggregations));
  errors.push(...validateSearchMode(body.search));
  errors.push(...validateSearchTermLength(body.search));
  return errors;
};
