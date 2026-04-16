/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesRequestQueryInput } from '../../../../../../common/api/detection_engine/rule_management/find_rules/find_rules_route.gen';
import { validateFindRulesRequestQuery } from '../../../../../../common/api/detection_engine/rule_management/find_rules/request_schema_validation';
import type { ReviewRuleInstallationRequestBodyInput } from '../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route';
import {
  MAX_SEARCH_RULES_SEARCH_TERM_LENGTH,
  validateAggregationsCountsUnique,
  validateSearchAfterRequiresSort,
  validateSearchRulesKqlFilter,
} from '../../../rule_management/api/rules/search_rules/request_schema_validation';

export const validateReviewRuleInstallationRequestBody = (
  body: ReviewRuleInstallationRequestBodyInput
): string[] => {
  const errors = [...validateFindRulesRequestQuery(body as FindRulesRequestQueryInput)];

  if (body.search != null && body.search.term.length > MAX_SEARCH_RULES_SEARCH_TERM_LENGTH) {
    errors.push(`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`);
  }

  errors.push(...validateSearchRulesKqlFilter(body.filter));
  errors.push(...validateSearchAfterRequiresSort(body));
  errors.push(...validateAggregationsCountsUnique(body.aggregations));

  const searchMode = body.search?.mode;
  if (searchMode != null && searchMode !== 'legacy') {
    errors.push(`unsupported search.mode "${searchMode}"`);
  }

  return errors;
};
