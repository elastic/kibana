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

  // Rule Status Dropdown
  STATUS_DROPDOWN: 'statusDropdown',
  STATUS_DROPDOWN_DISABLED_ITEM: 'statusDropdownDisabledItem',
  STATUS_DROPDOWN_ENABLED_ITEM: 'statusDropdownEnabledItem',

  // Rule Status Cell
  RULES_TABLE_CELL_STATUS: 'rulesTableCell-status',
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
 * Constants for generated metrics used in metric threshold rule tests
 */
export const GENERATED_METRICS = {
  metricName: 'system.diskio.write.bytes',
};

/**
 * Constants for data-test-subj values used in custom threshold rule tests
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

  // Rule Save
  RULE_SAVE_BUTTON: 'rulePageFooterSaveButton',
  CONFIRM_MODAL_BUTTON: 'confirmModalConfirmButton',
} as const;

/**
 * Constants for data-test-subj values used in rule details page tests
 */
export const RULE_DETAILS_TEST_SUBJECTS = {
  // Page elements
  RULE_DETAILS: 'ruleDetails',
  RULE_NAME: 'ruleName',
  RULE_TYPE: 'ruleSummaryRuleType',
  RULE_STATUS_PANEL: 'ruleStatusPanel',
  RULE_DEFINITION: 'ruleSummaryRuleDefinition',

  // Actions
  ACTIONS_BUTTON: 'actions',
  EDIT_RULE_BUTTON: 'editRuleButton',
  DELETE_RULE_BUTTON: 'deleteRuleButton',

  // Alert Summary Widget
  ALERT_SUMMARY_WIDGET_COMPACT: 'alertSummaryWidgetCompact',
  ACTIVE_ALERT_COUNT: 'activeAlertCount',
  TOTAL_ALERT_COUNT: 'totalAlertCount',

  // Rule Edit Form
  RULE_DETAILS_NAME_INPUT: 'ruleDetailsNameInput',
  DASHBOARDS_SELECTOR: 'dashboardsSelector',
} as const;
