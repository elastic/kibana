/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BIGGER_TIMEOUT = 20000 as const;
export const SHORTER_TIMEOUT = 5000 as const;

/**
 * Constants for data-test-subj values used in alerts page tests
 */
export const ALERTS_PAGE_TEST_SUBJECTS = {
  // Alerts Table
  ALERTS_TABLE_LOADING: 'internalAlertsPageLoading',
  ALERTS_TABLE_LOADED: 'alertsTableIsLoaded',
  ALERTS_TABLE_EMPTY_STATE: 'alertsTableEmptyState',
  ALERTS_TABLE_ROW_ACTION_MORE: 'alertsTableRowActionMore',
  ALERTS_TABLE_ACTIONS_MENU: 'alertsTableActionsMenu',

  // Case Actions
  ADD_TO_NEW_CASE_ACTION: 'add-to-new-case-action',
  ADD_TO_EXISTING_CASE_ACTION: 'add-to-existing-case-action',
  CREATE_CASE_FLYOUT: 'create-case-flyout',
  CREATE_CASE_MODAL: 'create-case-modal',
  CREATE_CASE_CANCEL: 'create-case-cancel',
  ALL_CASES_MODAL: 'all-cases-modal',
  ALL_CASES_MODAL_CANCEL: 'all-cases-modal-cancel-button',
} as const;

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

export const GENERATED_METRICS = {
  metricName: 'system.diskio.write.bytes',
};
