/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ABOUT_CONTINUE_BTN = '[data-test-subj="about-continue"]';

export const ABOUT_EDIT_BUTTON = '[data-test-subj="edit-about-rule"]';

export const ABOUT_EDIT_TAB = '[data-test-subj="edit-rule-about-tab"]';

export const ACTIONS_EDIT_TAB = '[data-test-subj="edit-rule-actions-tab"]';

export const ADD_FALSE_POSITIVE_BTN =
  '[data-test-subj="detectionEngineStepAboutRuleFalsePositives"] .euiButtonEmpty__text';

export const ADD_REFERENCE_URL_BTN =
  '[data-test-subj="detectionEngineStepAboutRuleReferenceUrls"] .euiButtonEmpty__text';

export const ALERT_SUPPRESSION_FIELDS = '[data-test-subj="alertSuppressionInput"]';

export const ALERT_SUPPRESSION_FIELDS_COMBO_BOX =
  '[data-test-subj="alertSuppressionInput"] [data-test-subj="comboBoxInput"]';

export const ALERT_SUPPRESSION_FIELDS_INPUT = `${ALERT_SUPPRESSION_FIELDS_COMBO_BOX} input`;

export const ALERT_SUPPRESSION_WARNING = '[data-test-subj="alertSuppressionWarning"]';

export const ALERT_SUPPRESSION_DURATION_OPTIONS =
  '[data-test-subj="alertSuppressionDuration"] [data-test-subj="alertSuppressionDurationOptions"]';

export const ALERT_SUPPRESSION_DURATION_PER_TIME_INTERVAL = `${ALERT_SUPPRESSION_DURATION_OPTIONS} #per-time-period`;

export const ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION = `${ALERT_SUPPRESSION_DURATION_OPTIONS} #per-rule-execution`;

export const ALERT_SUPPRESSION_MISSING_FIELDS_OPTIONS =
  '[data-test-subj="suppressionMissingFieldsOptions"]';

export const ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS = `${ALERT_SUPPRESSION_MISSING_FIELDS_OPTIONS} #suppress`;

export const ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS = `${ALERT_SUPPRESSION_MISSING_FIELDS_OPTIONS} #doNotSuppress`;

export const ALERT_SUPPRESSION_DURATION_VALUE_INPUT =
  '[data-test-subj="alertSuppressionDuration"] [data-test-subj="interval"]';

export const ALERT_SUPPRESSION_DURATION_UNIT_INPUT =
  '[data-test-subj="alertSuppressionDuration"] [data-test-subj="timeType"]';

export const THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX =
  '[data-test-subj="thresholdAlertSuppressionEnabled"] input';

export const ANOMALY_THRESHOLD_INPUT = '[data-test-subj="anomalyThresholdSlider"] .euiFieldNumber';

export const ADVANCED_SETTINGS_BTN = '[data-test-subj="advancedSettings"] .euiAccordion__button';

export const COMBO_BOX_CLEAR_BTN = '[data-test-subj="comboBoxClearButton"]';

export const CREATE_AND_ENABLE_BTN = '[data-test-subj="create-enable"]';

export const CREATE_WITHOUT_ENABLING_BTN = '[data-test-subj="create-enabled-false"]';

export const SAVE_WITH_ERRORS_MODAL = '[data-test-subj="save-with-errors-confirmation-modal"]';

export const SAVE_WITH_ERRORS_MODAL_CONFIRM_BTN = '[data-test-subj="confirmModalConfirmButton"]';

export const CUSTOM_QUERY_INPUT = '[data-test-subj="queryInput"]';

export const CUSTOM_QUERY_BAR = '[data-test-subj="detectionEngineStepDefineRuleQueryBar"]';

export const QUERY_BAR_ADD_FILTER =
  '[data-test-subj="detectionEngineStepDefineRuleQueryBar"] [data-test-subj="addFilter"]';

export const THREAT_MAPPING_COMBO_BOX_INPUT =
  '[data-test-subj="threatMatchInput"] [data-test-subj="fieldAutocompleteComboBox"]';

export const THREAT_MATCH_CUSTOM_QUERY_INPUT =
  '[data-test-subj="detectionEngineStepDefineRuleQueryBar"] [data-test-subj="queryInput"]';

export const THREAT_MATCH_QUERY_INPUT =
  '[data-test-subj="detectionEngineStepDefineThreatRuleQueryBar"] [data-test-subj="queryInput"]';

export const CUSTOM_INDEX_PATTERN_INPUT =
  '[data-test-subj="detectionEngineStepDefineRuleIndices"] [data-test-subj="comboBoxInput"]';

export const THREAT_MATCH_INDICATOR_INDICATOR_INDEX =
  '[data-test-subj="detectionEngineStepDefineRuleThreatMatchIndices"] [data-test-subj="comboBoxInput"]';

export const THREAT_MATCH_AND_BUTTON = '[data-test-subj="andButton"]';

export const THREAT_ITEM_ENTRY_DELETE_BUTTON = '[data-test-subj="itemEntryDeleteButton"]';

export const THREAT_MATCH_OR_BUTTON = '[data-test-subj="orButton"]';

export const THREAT_COMBO_BOX_INPUT =
  '[data-test-subj="stepDefineRule"] [data-test-subj="fieldAutocompleteComboBox"]';

export const INVALID_MATCH_CONTENT = 'All matches require both a field and threat index field.';

export const AT_LEAST_ONE_VALID_MATCH = 'At least one indicator match is required.';

export const AT_LEAST_ONE_INDEX_PATTERN = 'A minimum of one index pattern is required.';

export const CUSTOM_QUERY_REQUIRED = 'A custom query is required.';

export const DATA_VIEW_COMBO_BOX =
  '[data-test-subj="pick-rule-data-source"] [data-test-subj="comboBoxInput"]';

export const DATA_VIEW_OPTION = '[data-test-subj="rule-index-toggle-dataView"]';

export const DEFINE_CONTINUE_BUTTON = '[data-test-subj="define-continue"]';

export const DEFINE_EDIT_BUTTON = '[data-test-subj="edit-define-rule"]';

export const DEFINE_INDEX_INPUT =
  '[data-test-subj="detectionEngineStepDefineRuleIndices"] [data-test-subj="input"]';

export const EQL_TYPE = '[data-test-subj="eqlRuleType"]';

export const PREVIEW_HISTOGRAM = '[data-test-subj="preview-histogram-panel"]';

export const EQL_QUERY_INPUT = '[data-test-subj="eqlQueryBarTextInput"]';

export const EQL_QUERY_VALIDATION_SPINNER = '[data-test-subj="eql-validation-loading"]';

export const EQL_QUERY_VALIDATION_LABEL = '.euiFormLabel-isInvalid';

export const EQL_QUERY_VALIDATION_ERROR = '[data-test-subj="eql-validation-errors-popover-button"]';

export const EQL_QUERY_VALIDATION_ERROR_CONTENT =
  '[data-test-subj="eql-validation-errors-popover-content"]';

export const EQL_OPTIONS_POPOVER_TRIGGER = '[data-test-subj="eql-settings-trigger"]';

export const EQL_OPTIONS_TIMESTAMP_INPUT =
  '[data-test-subj="eql-timestamp-field"] [data-test-subj="comboBoxInput"]';

export const IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK =
  '[data-test-subj="importQueryFromSavedTimeline"]';

export const RELATED_INTEGRATION_COMBO_BOX_INPUT =
  '[data-test-subj="relatedIntegrationComboBox"] [data-test-subj="comboBoxSearchInput"]';

export const REQUIRED_FIELD_COMBO_BOX_INPUT =
  '[data-test-subj^="requiredFieldNameSelect"] [data-test-subj="comboBoxSearchInput"]';

export const INDICATOR_MATCH_TYPE = '[data-test-subj="threatMatchRuleType"]';

export const INPUT = '[data-test-subj="input"]';

export const MAX_SIGNALS_INPUT = '[data-test-subj="detectionEngineStepAboutRuleMaxSignals"]';

export const INVESTIGATION_NOTES_TEXTAREA =
  '[data-test-subj="detectionEngineStepAboutRuleNote"] textarea';

export const SETUP_GUIDE_TEXTAREA = '[data-test-subj="detectionEngineStepAboutRuleSetup"] textarea';

export const FALSE_POSITIVES_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleFalsePositives"] input';

export const LOOK_BACK_INTERVAL =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="interval"]';

export const LOOK_BACK_TIME_TYPE =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="timeType"]';

export const MACHINE_LEARNING_DROPDOWN_INPUT =
  '[data-test-subj="mlJobSelect"] [data-test-subj="comboBoxInput"]';

export const MACHINE_LEARNING_DROPDOWN_OPTION = '[data-test-subj="comboBoxOptionsList "] button';

export const MACHINE_LEARNING_TYPE = '[data-test-subj="machineLearningRuleType"]';

export const MITRE_TACTIC = '.euiContextMenuItem__text';

export const MITRE_ATTACK_TACTIC_DROPDOWN = '[data-test-subj="mitreAttackTactic"]';

export const MITRE_ATTACK_TECHNIQUE_DROPDOWN = '[data-test-subj="mitreAttackTechnique"]';

export const MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN = '[data-test-subj="mitreAttackSubtechnique"]';

export const MITRE_ATTACK_ADD_TACTIC_BUTTON = '[data-test-subj="addMitreAttackTactic"]';

export const MITRE_ATTACK_ADD_TECHNIQUE_BUTTON = '[data-test-subj="addMitreAttackTechnique"]';

export const MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON = '[data-test-subj="addMitreAttackSubtechnique"]';

export const REFERENCE_URLS_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleReferenceUrls"] input';

export const DEFAULT_RISK_SCORE_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleRiskScore-defaultRiskRange"].euiRangeInput';

export const RISK_MAPPING_OVERRIDE_OPTION = '#risk_score-mapping-override';

export const RISK_OVERRIDE =
  '[data-test-subj="detectionEngineStepAboutRuleRiskScore-riskOverride"]';

export const RULES_CREATION_FORM = '[data-test-subj="stepDefineRule"]';

export const RULES_CREATION_PREVIEW_BUTTON = '[data-test-subj="preview-container"]';

export const RULES_CREATION_PREVIEW_REFRESH_BUTTON = '[data-test-subj="previewSubmitButton"]';

export const RULE_DESCRIPTION_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleDescription"] [data-test-subj="input"]';

export const RULE_NAME_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleName"] [data-test-subj="input"]';

export const RULE_NAME_OVERRIDE = '[data-test-subj="detectionEngineStepAboutRuleRuleNameOverride"]';

export const RULE_NAME_OVERRIDE_FOR_ESQL =
  '[data-test-subj="detectionEngineStepAboutRuleRuleNameOverrideForEsqlRuleType"]';

export const RULE_STATUS = '[data-test-subj="ruleStatus"]';

export const RULE_TIMESTAMP_OVERRIDE =
  '[data-test-subj="detectionEngineStepAboutRuleTimestampOverride"]';

export const RUNS_EVERY_INTERVAL =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="interval"]';

export const RUNS_EVERY_TIME_TYPE =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="timeType"]';

export const SCHEDULE_CONTINUE_BUTTON = '[data-test-subj="schedule-continue"]';

export const SCHEDULE_EDIT_TAB = '[data-test-subj="edit-rule-schedule-tab"]';

export const SCHEDULE_INTERVAL_AMOUNT_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="interval"]';

export const SCHEDULE_INTERVAL_UNITS_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="timeType"]';

export const SCHEDULE_LOOKBACK_AMOUNT_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="interval"]';

export const SCHEDULE_LOOKBACK_UNITS_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="timeType"]';

export const SEVERITY_DROPDOWN =
  '[data-test-subj="detectionEngineStepAboutRuleSeverity"] [data-test-subj="select"]';

export const SEVERITY_MAPPING_OVERRIDE_OPTION = '#severity-mapping-override';

export const SEVERITY_OVERRIDE_ROW = '[data-test-subj="severityOverrideRow"]';

export const TAGS_FIELD =
  '[data-test-subj="detectionEngineStepAboutRuleTags"] [data-test-subj="comboBoxInput"]';

export const TAGS_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleTags"] [data-test-subj="comboBoxSearchInput"]';

export const TAGS_CLEAR_BUTTON =
  '[data-test-subj="detectionEngineStepAboutRuleTags"] [data-test-subj="comboBoxClearButton"]';

export const INVESTIGATIONS_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleInvestigationFields"] [data-test-subj="comboBoxSearchInput"]';

export const THRESHOLD_INPUT_AREA = '[data-test-subj="thresholdInput"]';

export const THRESHOLD_TYPE = '[data-test-subj="thresholdRuleType"]';

export const NEW_TERMS_TYPE = '[data-test-subj="newTermsRuleType"]';

export const ESQL_TYPE = '[data-test-subj="esqlRuleType"]';

export const ESQL_QUERY_BAR_INPUT_AREA = '[data-test-subj="ruleEsqlQueryBar"] textarea';

export const ESQL_QUERY_BAR = '[data-test-subj="ruleEsqlQueryBar"]';

export const NEW_TERMS_INPUT_AREA = '[data-test-subj="newTermsInput"]';

export const NEW_TERMS_HISTORY_SIZE =
  '[data-test-subj="historyWindowSize"] [data-test-subj="interval"]';

export const NEW_TERMS_HISTORY_TIME_TYPE =
  '[data-test-subj="historyWindowSize"] [data-test-subj="timeType"]';

export const LOAD_QUERY_DYNAMICALLY_CHECKBOX =
  '[data-test-subj="detectionEngineStepDefineRuleShouldLoadQueryDynamically"] input';

export const SHOW_QUERY_BAR_BUTTON = '[data-test-subj="showQueryBarMenu"]';

export const QUERY_BAR = '[data-test-subj="detectionEngineStepDefineRuleQueryBar"]';

export const LOAD_SAVED_QUERIES_LIST_BUTTON =
  '[data-test-subj="saved-query-management-load-button"]';

export const savedQueryByName = (savedQueryName: string) =>
  `[data-test-subj="load-saved-query-${savedQueryName}-button"]`;

export const APPLY_SELECTED_SAVED_QUERY_BUTTON =
  '[data-test-subj="saved-query-management-apply-changes-button"]';

export const RULE_INDICES =
  '[data-test-subj="detectionEngineStepDefineRuleIndices"] [data-test-subj="comboBoxInput"]';

export const ALERTS_INDEX_BUTTON = 'span[title=".alerts-security.alerts-default"] button';

export const PREVIEW_SUBMIT_BUTTON = '[data-test-subj="previewSubmitButton"]';

export const PREVIEW_LOGGED_REQUESTS_CHECKBOX = '[data-test-subj="show-elasticsearch-requests"]';

export const PREVIEW_LOGGED_REQUESTS_ACCORDION_BUTTON =
  '[data-test-subj="preview-logged-requests-accordion"] button';

export const PREVIEW_LOGGED_REQUESTS_ITEM_ACCORDION_BUTTON =
  '[data-test-subj="preview-logged-requests-item-accordion"] button';

export const PREVIEW_LOGGED_REQUEST_DESCRIPTION =
  '[data-test-subj="preview-logged-request-description"]';

export const PREVIEW_LOGGED_REQUEST_CODE_BLOCK =
  '[data-test-subj="preview-logged-request-code-block"]';
