/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BIGGER_TIMEOUT = 20000 as const;
export const SHORTER_TIMEOUT = 5000 as const;

/**
 * Constants for generated metrics used in metric threshold rule tests.
 */
export const GENERATED_METRICS = {
  metricName: 'system.diskio.write.bytes',
};

/**
 * Constants for data-test-subj values used in custom threshold rule tests.
 */
export const CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS = {
  // Rule Type Selection
  CUSTOM_THRESHOLD_RULE_TYPE_CARD: 'observability.rules.custom_threshold-SelectOption',

  // Rule Form
  RULE_FORM: 'ruleForm',
  RULE_NAME_INPUT: 'ruleDetailsNameInput',

  // Data View Selection
  DATA_VIEW_EXPRESSION: 'selectDataViewExpression',
  INDEX_PATTERN_INPUT: 'indexPattern-switcher--input',
  EXPLORE_MATCHING_INDICES_BUTTON: 'explore-matching-indices-button',

  // Metric Row / Custom Equation
  AGGREGATION_NAME_A: 'aggregationNameA',
  AGGREGATION_TYPE_SELECT: 'aggregationTypeSelect',

  // KQL Filter
  KQL_SEARCH_FIELD: 'o11ySearchField',
  KQL_SUGGESTIONS_PANEL: 'o11ySuggestionsPanel',

  // Rule Save
  RULE_SAVE_BUTTON: 'rulePageFooterSaveButton',
  CONFIRM_MODAL_BUTTON: 'confirmModalConfirmButton',
} as const;
