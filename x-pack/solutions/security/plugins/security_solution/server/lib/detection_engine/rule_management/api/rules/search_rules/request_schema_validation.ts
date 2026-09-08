/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import type { FindRulesRequestQueryInput } from '../../../../../../../common/api/detection_engine/rule_management/find_rules/find_rules_route.gen';
import { validateFindRulesRequestQuery } from '../../../../../../../common/api/detection_engine/rule_management/find_rules/request_schema_validation';
import type { GranularRulesFilter } from '../../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import type { SearchRulesRequestBodyInput } from '../../../../../../../common/api/detection_engine/rule_management/search_rules/search_rules_route.gen';
import { VALID_SEARCH_FIELDS } from '../../../logic/search/search_rules_field_translation';

export const MAX_SEARCH_RULES_SEARCH_TERM_LENGTH = 1000;

export const MAX_SEARCH_RULES_FILTER_KQL_LENGTH = 10_000;

const validateKqlFilterTerm = (term: string | undefined): string[] => {
  if (term == null || term.trim() === '') {
    return [];
  }
  if (term.length > MAX_SEARCH_RULES_FILTER_KQL_LENGTH) {
    return [`filter exceeds maximum length of ${MAX_SEARCH_RULES_FILTER_KQL_LENGTH}`];
  }
  try {
    fromKueryExpression(term);
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [`invalid KQL filter: ${message}`];
  }
};

export const validateSearchRulesFilter = (filter: GranularRulesFilter | undefined): string[] => {
  if (filter == null) {
    return [];
  }
  const mode = filter.mode ?? 'KQL';
  if (mode !== 'KQL') {
    return [`unsupported filter.mode "${mode}"`];
  }
  return validateKqlFilterTerm(filter.term);
};

export const validateSearchAfterRequiresSort = (body: SearchRulesRequestBodyInput): string[] => {
  const searchAfter = body.search_after;
  if (searchAfter == null || searchAfter.length === 0) {
    return [];
  }
  if (body.sort_field == null || body.sort_order == null) {
    return ['when search_after is provided, sort_field and sort_order must be set'];
  }
  return [];
};

export const validateSearchRulesFields = (fields: string[] | undefined): string[] => {
  if (fields == null || fields.length === 0) {
    return [];
  }
  const invalid = fields.filter((f) => !VALID_SEARCH_FIELDS.has(f));
  if (invalid.length === 0) {
    return [];
  }
  return [`unsupported fields: ${invalid.map((f) => `"${f}"`).join(', ')}`];
};

export const validateAggregationsCountsUnique = (
  aggregations: { counts?: string[] } | undefined
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

export const validateSearchRulesRequestBody = (body: SearchRulesRequestBodyInput): string[] => {
  const errors = [...validateFindRulesRequestQuery(body as FindRulesRequestQueryInput)];

  if (body.search != null && body.search.term.length > MAX_SEARCH_RULES_SEARCH_TERM_LENGTH) {
    errors.push(`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`);
  }

  errors.push(...validateSearchRulesFilter(body.filter));
  errors.push(...validateSearchAfterRequiresSort(body));
  errors.push(...validateAggregationsCountsUnique(body.aggregations));
  errors.push(...validateSearchRulesFields(body.fields));

  const searchMode = body.search?.mode;
  if (searchMode != null && searchMode !== 'legacy') {
    errors.push(`unsupported search.mode "${searchMode}"`);
  }

  const hasGapFilters = Array.isArray(body.gap_fill_statuses) && body.gap_fill_statuses.length > 0;
  const hasGapRangeStart = Boolean(body.gaps_range_start);
  const hasGapRangeEnd = Boolean(body.gaps_range_end);

  const hasSearchAfter = body.search_after != null && body.search_after.length > 0;
  if (hasSearchAfter && hasGapFilters && hasGapRangeStart && hasGapRangeEnd) {
    errors.push(
      '"search_after" is not supported when gap filtering is active. Use "page" and "per_page" to paginate gap-filtered results.'
    );
  }

  return errors;
};
