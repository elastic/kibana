/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BIGGER_TIMEOUT = 20000 as const;
export const SHORTER_TIMEOUT = 5000 as const;

/**
 * Constants for data-test-subj values used in rules settings flyout tests
 */
export const RULES_SETTINGS_TEST_SUBJECTS = {
  // Rules List Page
  RULE_PAGE_TAB: 'ruleLogsTab',
  RULES_SETTINGS_LINK: 'rulesSettingsLink',
  RULES_TABLE_CONTAINER: 'rulesListSection',
  RULES_TABLE: 'rulesList',
  RULE_ROW: 'rule-row',
  RULE_ROW_NON_EDITABLE: 'rule-row-isNotEditable',

  // Rules Settings Flyout
  RULES_SETTINGS_FLYOUT: 'rulesSettingsFlyout',
  RULES_SETTINGS_FLYOUT_CANCEL_BUTTON: 'rulesSettingsFlyoutCancelButton',
  RULES_SETTINGS_FLYOUT_SAVE_BUTTON: 'rulesSettingsFlyoutSaveButton',
} as const;

export const RULE_LIST_TEST_SUBJECTS = {
  // Rule Actions
  RULE_SIDEBAR_EDIT_ACTION: 'ruleSidebarEditAction',
  EDIT_ACTION_HOVER_BUTTON: 'editActionHoverButton',
} as const;

/**
 * Constants for data-test-subj values used in rule type modal tests
 */
export const RULE_TYPE_MODAL_TEST_SUBJECTS = {
  // Rules List Page
  CREATE_RULE_BUTTON: 'createRuleButton',

  // Rule Type Modal
  RULE_TYPE_MODAL: 'ruleTypeModal',
  RULE_TYPE_MODAL_SEARCH: 'ruleTypeModalSearch',
  ALL_RULE_TYPES_BUTTON: 'allRuleTypesButton',
  CUSTOM_THRESHOLD_RULE_TYPE: 'observability.rules.custom_threshold-SelectOption',
} as const;

/**
 * Constants for data-test-subj values used in logs tab tests
 */
export const LOGS_TAB_TEST_SUBJECTS = {
  LOGS_TAB: 'ruleLogsTab',
  EVENT_LOG_TABLE: 'ruleEventLogListTable',
  RULE_DETAILS: 'ruleDetails',
} as const;

/**
 * Constants for data-test-subj values used in custom threshold rule tests
 */
export const CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS = {
  // Rule Type Modal
  CUSTOM_THRESHOLD_RULE_TYPE_SELECTOR: 'observability.rules.custom_threshold-SelectOption',

  // Rule Form
  RULE_NAME_INPUT: 'ruleDetailsNameInput',
  RULE_TAGS_INPUT: 'ruleDetailsTagsInput',
  SAVE_BUTTON: 'rulePageFooterSaveButton',
  CONFIRM_MODAL_BUTTON: 'confirmModalConfirmButton',

  // Data View
  DATA_VIEW_EXPRESSION: 'selectDataViewExpression',
  DATA_VIEW_INPUT: 'indexPattern-switcher--input',

  // Aggregation
  AGGREGATION_NAME_A: 'aggregationNameA',
  AGGREGATION_NAME_B: 'aggregationNameB',
  AGGREGATION_TYPE_SELECT: 'aggregationTypeSelect',
  AGGREGATION_FIELD: 'aggregationField',
  ADD_AGGREGATION_BUTTON: 'thresholdRuleCustomEquationEditorAddAggregationFieldButton',
  CLOSE_POPOVER_BUTTON: 'o11yClosablePopoverTitleButton',
  SEARCH_FIELD: 'o11ySearchField',

  // Custom Equation
  CUSTOM_EQUATION: 'customEquation',
  EQUATION_TEXT_FIELD: 'thresholdRuleCustomEquationEditorFieldText',
  EQUATION_LABEL_INPUT: 'thresholdRuleCustomEquationEditorFieldTextLabel',

  // Threshold
  THRESHOLD_POPOVER: 'thresholdPopover',
  COMPARATOR_SELECT: 'comparatorOptionsComboBox',
  THRESHOLD_INPUT_0: 'alertThresholdInput0',
  THRESHOLD_INPUT_1: 'alertThresholdInput1',

  // Time Range
  FOR_LAST_EXPRESSION: 'forLastExpression',
  TIME_WINDOW_SIZE: 'timeWindowSizeNumber',
  TIME_WINDOW_UNIT: 'timeWindowUnitSelect',

  // Group By
  GROUP_BY_INPUT: 'thresholdRuleMetricsExplorer-groupBy',
} as const;
