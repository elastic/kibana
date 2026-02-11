/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CHART_PANEL_TEST_SUBJECTS = {
  LOADING: 'chart_is_loading',
  EMPTY: 'chart_is_empty',
  ERROR: 'chart_is_error',
  TEST_CHART: 'testing_chart',
};

export const NO_FINDINGS_STATUS_TEST_SUBJ = {
  NO_AGENTS_DEPLOYED: 'status-api-no-agent-deployed',
  INDEXING: 'status-api-indexing',
  INDEX_TIMEOUT: 'status-api-index-timeout',
  UNPRIVILEGED: 'status-api-unprivileged',
  NO_FINDINGS: 'no-findings-found',
};

export const EMPTY_STATE_TEST_SUBJ = 'csp:empty-state';
export const NO_VULNERABILITIES_STATUS_TEST_SUBJ = {
  SCANNING_VULNERABILITIES: 'scanning-vulnerabilities-empty-prompt',
  NOT_INSTALLED: 'cnvm-integration-not-installed',
  NOT_DEPLOYED: 'agent-not-deployed-vuln-mgmt',
  UNPRIVILEGED: 'status-api-vuln-mgmt-unprivileged',
  NO_VULNERABILITIES: 'no-vulnerabilities-vuln-mgmt-found',
  INDEX_TIMEOUT: 'vulnerabilities-timeout',
};
export const CNVM_NOT_INSTALLED_ACTION_SUBJ = 'cnvm-not-installed-action';
export const CSPM_NOT_INSTALLED_ACTION_SUBJ = 'cspm-not-installed-action';
export const KSPM_NOT_INSTALLED_ACTION_SUBJ = 'kspm-not-installed-action';
export const THIRD_PARTY_INTEGRATIONS_NO_MISCONFIGURATIONS_FINDINGS_PROMPT =
  '3p-integrations-no-misconfigurations-findings-prompt';
export const THIRD_PARTY_INTEGRATIONS_NO_VULNERABILITIES_FINDINGS_PROMPT =
  '3p-integrations-no-vulnerabilities-findings-prompt';
export const THIRD_PARTY_NO_MISCONFIGURATIONS_FINDINGS_PROMPT_INTEGRATION_BUTTON =
  '3p-no-misconfigurations-findings-prompt-integration-button';
export const THIRD_PARTY_NO_VULNERABILITIES_FINDINGS_PROMPT_INTEGRATION_BUTTON =
  '3p-no-vulnerabilities-findings-prompt-integration-button';
export const VULNERABILITIES_CONTAINER_TEST_SUBJ = 'vulnerabilities_container';

export const TAKE_ACTION_SUBJ = 'csp:take_action';
export const CREATE_RULE_ACTION_SUBJ = 'csp:create_rule';

export const CSP_GROUPING = 'cloudSecurityGrouping';
export const CSP_GROUPING_LOADING = 'cloudSecurityGroupingLoading';
export const CSP_FINDINGS_COMPLIANCE_SCORE = 'cloudSecurityFindingsComplianceScore';

export const CSP_FIELDS_SELECTOR_MODAL = 'cloudSecurityFieldsSelectorModal';
export const CSP_FIELDS_SELECTOR_OPEN_BUTTON = 'cloudSecurityFieldsSelectorOpenButton';
export const CSP_FIELDS_SELECTOR_RESET_BUTTON = 'cloudSecurityFieldsSelectorResetButton';
export const CSP_FIELDS_SELECTOR_CLOSE_BUTTON = 'cloudSecurityFieldsSelectorCloseButton';

export const SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT = 'cloud_posture_page_subscription_not_allowed';

export const COMPLIANCE_SCORE_BAR_UNKNOWN = 'complianceScoreBarUnknown';
export const COMPLIANCE_SCORE_BAR_FAILED = 'complianceScoreBarFailed';
export const COMPLIANCE_SCORE_BAR_PASSED = 'complianceScoreBarPassed';
