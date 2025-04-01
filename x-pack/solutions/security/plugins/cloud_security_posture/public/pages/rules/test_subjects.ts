/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CSP_RULES_CONTAINER = 'csp_rules_container';

export const CSP_RULES_TABLE = 'csp_rules_table';
export const CSP_RULES_TABLE_ROW_ITEM_NAME = 'csp_rules_table_row_item_name';
export const CSP_RULES_FLYOUT_CONTAINER = 'csp_rules_flyout_container';

export const RULE_COUNTERS_TEST_SUBJ = {
  RULE_COUNTERS_EMPTY_STATE: 'rules-counters-empty-state',
  POSTURE_SCORE_COUNTER: 'rules-counters-posture-score-counter',
  POSTURE_SCORE_BUTTON: 'rules-counters-posture-score-button',
  INTEGRATIONS_EVALUATED_COUNTER: 'rules-counters-integrations-evaluated-counter',
  INTEGRATIONS_EVALUATED_BUTTON: 'rules-counters-integrations-evaluated-button',
  FAILED_FINDINGS_COUNTER: 'rules-counters-failed-findings-counter',
  FAILED_FINDINGS_BUTTON: 'rules-counters-failed-findings-button',
  DISABLED_RULES_COUNTER: 'rules-counters-disabled-rules-counter',
  DISABLED_RULES_BUTTON: 'rules-counters-disabled-rules-button',
};

export const RULES_TABLE_HEADER_TEST_SUBJ = {
  RULES_TABLE_HEADER_SEARCH_INPUT: 'rules-table-header-search-input',
  RULES_TABLE_HEADER_MULTI_SELECT: 'rules-table-header-multi-select',
  RULES_TABLE_HEADER_RULE_NUMBER_SELECT: 'rules-table-header-rule-number-select',
  RULES_TABLE_HEADER_RULE_SHOWING_LABEL: 'rules-table-header-rule-showing-label',
  BULK_ACTION_BUTTON: 'bulk-action-button',
  BULK_ACTION_OPTION_ENABLE: 'bulk-action-option-enable',
  BULK_ACTION_OPTION_DISABLE: 'bulk-action-option-disable',
  SELECT_ALL_RULES: 'select-all-rules-button',
  CLEAR_ALL_RULES_SELECTION: 'clear-rules-selection-button',
  RULES_DISABLED_FILTER: 'rules-disabled-filter',
  RULES_ENABLED_FILTER: 'rules-enabled-filter',
  RULES_TABLE_HEADER_RULE_NUMBER_SELECT_BUTTON: 'rules-table-header-rule-number-select-button',
};

export const RULES_TABLE = {
  RULES_ROWS_ENABLE_SWITCH_BUTTON: 'rules-row-enable-switch-button',
  RULES_ROW_SELECT_ALL_CURRENT_PAGE: 'cloud-security-fields-selector-item-all',
};

export const getCspBenchmarkRuleTableRowItemTestId = (id: string) =>
  `${CSP_RULES_TABLE_ROW_ITEM_NAME}_${id}`;
