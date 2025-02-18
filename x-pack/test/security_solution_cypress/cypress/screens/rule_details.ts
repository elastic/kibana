/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const POPOVER_ACTIONS_TRIGGER_BUTTON =
  '[data-test-subj="rules-details-popover-button-icon"]';

export const ABOUT_INVESTIGATION_NOTES = '[data-test-subj="stepAboutDetailsNoteContent"]';

export const ABOUT_RULE_DESCRIPTION = '[data-test-subj=stepAboutRuleDetailsToggleDescriptionText]';

export const ABOUT_DETAILS =
  '[data-test-subj="aboutRule"] [data-test-subj="listItemColumnStepRuleDescription"]';

export const ADDITIONAL_LOOK_BACK_DETAILS = 'Additional look-back time';

export const INTERVAL_ABBR_VALUE = '[data-test-subj="interval-abbr-value"]';

export const ALERTS_TAB = '[data-test-subj="navigation-alerts"]';

export const ANOMALY_SCORE_DETAILS = 'Anomaly score';

export const CUSTOM_QUERY_DETAILS = 'Custom query';

export const EQL_QUERY_DETAILS = 'EQL query';

export const ESQL_QUERY_DETAILS = 'ES|QL query';

export const SAVED_QUERY_NAME_DETAILS = 'Saved query name';

export const SAVED_QUERY_DETAILS = /^Saved query$/;

export const SAVED_QUERY_FILTERS_DETAILS = 'Saved query filters';

export const DATA_VIEW_DETAILS = 'Data view';

export const DEFINITION_DETAILS =
  '[data-test-subj=definitionRule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const DETAILS_DESCRIPTION = '.euiDescriptionList__description';

export const DETAILS_TITLE = '.euiDescriptionList__title';

export const EXCEPTIONS_TAB = 'a[data-test-subj="navigation-rule_exceptions"]';

export const EXCEPTIONS_TAB_EXPIRED_FILTER = '[data-test-subj="expired"]';

export const EXCEPTIONS_TAB_ACTIVE_FILTER = '[data-test-subj="active"]';

export const EXCEPTIONS_ITEM_CONTAINER = '[data-test-subj="exceptionsContainer"]';

export const FALSE_POSITIVES_DETAILS = 'False positive examples';

export const INDEX_PATTERNS_DETAILS = 'Index patterns';

export const INVESTIGATION_FIELDS_DETAILS = 'Custom highlighted fields';

export const ENDPOINT_EXCEPTIONS_TAB = 'a[data-test-subj="navigation-endpoint_exceptions"]';

export const INDICATOR_INDEX_PATTERNS = 'Indicator index patterns';

export const INDICATOR_INDEX_QUERY = 'Indicator index query';

export const INDICATOR_MAPPING = 'Indicator mapping';

export const INTEGRATION_LINK = '[data-test-subj="integrationLink"]';

export const INTEGRATION_STATUS = '[data-test-subj="statusBadge"]';

export const INVESTIGATION_NOTES_MARKDOWN = 'test markdown';

export const INVESTIGATION_NOTES_TOGGLE = '[data-test-subj="stepAboutDetailsToggle-notes"]';

export const MACHINE_LEARNING_JOB_ID = '[data-test-subj="machineLearningJob"]';

export const MACHINE_LEARNING_JOB_STATUS = '[data-test-subj="machineLearningJobStatus"]';

export const MITRE_ATTACK_DETAILS = 'MITRE ATT&CK';

export const NEW_TERMS_FIELDS_DETAILS = 'Fields';

export const NEW_TERMS_HISTORY_WINDOW_DETAILS = 'History Window Size';

export const FIELDS_BROWSER_BTN =
  '[data-test-subj="alertsTable"] [data-test-subj="show-field-browser"]';

export const LAST_EXECUTION_STATUS_REFRESH_BUTTON =
  '[data-test-subj="ruleLastExecutionStatusRefreshButton"]';

export const RULE_NAME_HEADER = '[data-test-subj="header-page-title"]';

export const RULE_NAME_OVERRIDE_DETAILS = 'Rule name override';

export const RISK_SCORE_DETAILS = 'Risk score';

export const INDICATOR_PREFIX_OVERRIDE = 'Indicator prefix override';

export const RISK_SCORE_OVERRIDE_DETAILS = 'Risk score override';

export const REFERENCE_URLS_DETAILS = 'Reference URLs';

export const EXCEPTION_ITEM_ACTIONS_BUTTON =
  'button[data-test-subj="exceptionItemCardHeader-actionButton"]';

export const REMOVE_EXCEPTION_BTN = '[data-test-subj="exceptionItemCardHeader-actionItem-delete"]';

export const EDIT_EXCEPTION_BTN = '[data-test-subj="exceptionItemCardHeader-actionItem-edit"]';

export const RULE_SWITCH = '[data-test-subj="ruleSwitch"]';

export const RULE_TYPE_DETAILS = 'Rule type';

export const RUNS_EVERY_DETAILS = 'Runs every';

export const SCHEDULE_DETAILS =
  '[data-test-subj=schedule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const SEVERITY_DETAILS = 'Severity';

export const TAGS_DETAILS = 'Tags';

export const THRESHOLD_DETAILS = 'Threshold';

export const TIMELINE_TEMPLATE_DETAILS = 'Timeline template';

export const TIMESTAMP_OVERRIDE_DETAILS = 'Timestamp override';

export const SUPPRESS_BY_DETAILS = 'Suppress alerts by';

export const SUPPRESS_FOR_DETAILS = 'Suppress alerts for';

export const SUPPRESS_MISSING_FIELD = 'If a suppression field is missing';

export const TIMELINE_FIELD = (field: string) => {
  return `[data-test-subj="formatted-field-${field}"]`;
};

export const removeExternalLinkText = (str: string) =>
  str.replace(/\([^)]*(opens in a new tab or window)[^)]*\)/g, '');

export const DEFINE_RULE_PANEL_PROGRESS =
  '[data-test-subj="defineRule"] [data-test-subj="stepPanelProgress"]';

export const EDIT_RULE_SETTINGS_LINK = '[data-test-subj="editRuleSettingsLink"]';

export const THREAT_TACTIC = '[data-test-subj="threatTacticLink"]';

export const THREAT_TECHNIQUE = '[data-test-subj="threatTechniqueLink"]';

export const THREAT_SUBTECHNIQUE = '[data-test-subj="threatSubtechniqueLink"]';

export const ALERT_SUPPRESSION_INSUFFICIENT_LICENSING_ICON =
  '[data-test-subj="alertSuppressionInsufficientLicensingIcon"]';

export const HIGHLIGHTED_ROWS_IN_TABLE =
  '[data-test-subj="euiDataGridBody"] .alertsTableHighlightedRow';

export const MAX_SIGNALS_DETAILS = '[data-test-subj="maxSignalsPropertyValue"]';

export const DESCRIPTION_SETUP_GUIDE_BUTTON = '[data-test-subj="stepAboutDetailsToggle-setup"]';

export const DESCRIPTION_SETUP_GUIDE_CONTENT = '[data-test-subj="stepAboutDetailsSetupContent"]';

export const EXECUTIONS_TAB = 'a[data-test-subj="navigation-execution_results"]';

export const EXECUTION_SHOWING = `[data-test-subj="executionsShowing"]`;

export const EXECUTION_TABLE = `[data-test-subj="executionsTable"]`;

export const EXECUTION_LOG_CONTAINER = `[data-test-subj="executionLogContainer"]`;

export const EXECUTION_RUN_TYPE_FILTER = `[data-test-subj="ExecutionRunTypeFilter"]`;

export const EXECUTION_RUN_TYPE_FILTER_ITEM = `[data-test-subj="ExecutionRunTypeFilter-item"]`;

export const RULE_BACKFILLS_INFO_HEADEAR =
  '[data-test-subj="rule-backfills-info"] [data-test-subj="header-section"]';

export const RULE_BACKFILLS_TABLE = '[data-test-subj="rule-backfills-table"]';

export const RULE_BACKFILLS_COLUMN_ERROR = '[data-test-subj="rule-backfills-column-error"]';
export const RULE_BACKFILLS_COLUMN_PENDING = '[data-test-subj="rule-backfills-column-pending"]';
export const RULE_BACKFILLS_COLUMN_RUNNING = '[data-test-subj="rule-backfills-column-running"]';
export const RULE_BACKFILLS_COLUMN_COMPLETED = '[data-test-subj="rule-backfills-column-completed"]';
export const RULE_BACKFILLS_COLUMN_TOTAL = '[data-test-subj="rule-backfills-column-total"]';
export const RULE_BACKFILLS_DELETE_BUTTON = '[data-test-subj="rule-backfills-delete-button"]';
export const RULE_BACKFILLS_DELETE_MODAL = '[data-test-subj="rule-backfills-delete-modal"]';
export const RULE_BACKFILL_DELETE_MODAL_CONFIRM_BUTTON = `${RULE_BACKFILLS_DELETE_MODAL} [data-test-subj="confirmModalConfirmButton"]`;

// Rule gaps selectors
export const RULE_GAPS_INFO = '[data-test-subj="rule-gaps-info"]';
export const RULE_GAPS_TABLE = '[data-test-subj="rule-gaps-table"]';
export const RULE_GAPS_STATUS_FILTER = '[data-test-subj="rule-gaps-status-filter"]';
export const RULE_GAPS_DATE_FILTER_OPTION = `[data-test-subj="rule-gaps-status-filter-item"]`;
export const RULE_GAPS_FILL_BUTTON =
  '[data-test-subj="rule-gaps-table"] [data-test-subj="rule-gaps-fill-gap-button"]';
export const RULE_GAPS_FILL_TOOLTIP = '[data-test-subj="rule-gaps-fill-gap-tooltip"]';
export const RULE_GAPS_PROGRESS_BAR = '[data-test-subj="rule-gaps-progress-bar"]';
export const RULE_GAPS_DATE_PICKER = '[data-test-subj="rule-gaps-date-picker"]';
export const RULE_GAPS_DATE_PICKER_APPLY_REFRESH = `${RULE_GAPS_DATE_PICKER} .euiSuperUpdateButton`;
