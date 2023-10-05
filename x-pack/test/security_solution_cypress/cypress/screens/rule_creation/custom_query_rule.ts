/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CUSTOM_QUERY_INPUT = '[data-test-subj="queryInput"]';

export const CUSTOM_QUERY_BAR = '[data-test-subj="detectionEngineStepDefineRuleQueryBar"]';

export const CUSTOM_QUERY_REQUIRED = 'A custom query is required.';

/*
 * Saved Queries
 */

export const LOAD_QUERY_DYNAMICALLY_CHECKBOX =
  '[data-test-subj="detectionEngineStepDefineRuleShouldLoadQueryDynamically"] input';

export const LOAD_SAVED_QUERIES_LIST_BUTTON =
  '[data-test-subj="saved-query-management-load-button"]';

export const savedQueryByName = (savedQueryName: string) =>
  `[data-test-subj="load-saved-query-${savedQueryName}-button"]`;

export const APPLY_SELECTED_SAVED_QUERY_BUTTON =
  '[data-test-subj="saved-query-management-apply-changes-button"]';
