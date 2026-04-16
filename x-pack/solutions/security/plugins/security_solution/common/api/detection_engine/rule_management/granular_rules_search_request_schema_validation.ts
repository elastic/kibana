/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SEARCH_RULES_SEARCH_TERM_LENGTH } from './search_rules_limits';

/**
 * Subset of request fields shared by `_search`, install review, and upgrade review
 * for sort, `search_after`, aggregations, and legacy `search` options.
 */
export interface GranularRulesSearchConstraintBody {
  sort_field?: unknown;
  sort_order?: unknown;
  search_after?: readonly unknown[] | unknown[] | undefined;
  aggregations?: { counts?: readonly string[] | string[] | undefined } | undefined;
  search?: { term?: string; mode?: string | undefined } | undefined;
}

export const GRANULAR_RULES_SORT_FIELD_ORDER_COEXIST_DEFAULT_MESSAGE =
  'sort_field and sort_order must be provided together';

/**
 * Validates that `sort_field` and `sort_order` are either both set or both omitted.
 *
 * @param mismatchMessage - e.g. find-rules query uses a different string than review bodies.
 */
export const validateSortFieldAndOrderCoexist = (
  body: { sort_field?: unknown; sort_order?: unknown },
  mismatchMessage: string = GRANULAR_RULES_SORT_FIELD_ORDER_COEXIST_DEFAULT_MESSAGE
): string[] => {
  const hasField = body.sort_field != null;
  const hasOrder = body.sort_order != null;
  if (hasField !== hasOrder) {
    return [mismatchMessage];
  }
  return [];
};

export const validateGranularRulesSearchAfterRequiresSort = (
  body: GranularRulesSearchConstraintBody
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

export const validateGranularRulesAggregationsCountsUnique = (
  aggregations: GranularRulesSearchConstraintBody['aggregations']
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

export const validateGranularRulesSearchMode = (
  search: GranularRulesSearchConstraintBody['search']
): string[] => {
  const searchMode = search?.mode;
  if (searchMode != null && searchMode !== 'legacy') {
    return [`unsupported search.mode "${searchMode}"`];
  }
  return [];
};

export const validateGranularRulesSearchTermLength = (
  search: GranularRulesSearchConstraintBody['search']
): string[] => {
  if (search?.term != null && search.term.length > MAX_SEARCH_RULES_SEARCH_TERM_LENGTH) {
    return [`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`];
  }
  return [];
};

/**
 * Shared validation for `search_after`, `aggregations.counts`, and `search` (mode + term length).
 * Callers must add KQL `filter` validation and, when applicable, `sort_field`/`sort_order` coexistence
 * (e.g. `_search` defers sort coexistence to {@link validateFindRulesRequestQuery}).
 */
export const validateGranularRulesSearchAfterAggsAndSearch = (
  body: GranularRulesSearchConstraintBody
): string[] => {
  const errors: string[] = [];
  errors.push(...validateGranularRulesSearchAfterRequiresSort(body));
  errors.push(...validateGranularRulesAggregationsCountsUnique(body.aggregations));
  errors.push(...validateGranularRulesSearchMode(body.search));
  errors.push(...validateGranularRulesSearchTermLength(body.search));
  return errors;
};
