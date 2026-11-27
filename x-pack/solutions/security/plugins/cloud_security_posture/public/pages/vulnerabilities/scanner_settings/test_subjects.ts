/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SCANNER_SETTINGS_TEST_SUBJECTS = {
  PAGE: 'nativeVulnScannerSettingsPage',
  LOADING: 'nativeVulnScannerSettingsLoading',
  ERROR: 'nativeVulnScannerSettingsError',
  UPGRADE_CALLOUT: 'nativeVulnScannerUpgradeCallout',
  EXPLAINER: 'nativeVulnScannerExplainer',
  READ_ONLY_CALLOUT: 'nativeVulnScannerReadOnlyCallout',
  AGENTS_TRUNCATED_CALLOUT: 'nativeVulnScannerAgentsTruncatedCallout',
  NEEDS_OSQUERY_CALLOUT: 'nativeVulnScannerNeedsOsqueryCallout',
  NEEDS_OSQUERY_LINK: 'nativeVulnScannerNeedsOsqueryLink',
  AGENTLESS_CALLOUT: 'nativeVulnScannerAgentlessCallout',
  PACK_DRIFT_CALLOUT: 'nativeVulnScannerPackDriftCallout',
  POLICY_TABLE: 'nativeVulnScannerPolicyTable',
  ENABLE_BUTTON: 'nativeVulnScannerEnableButton',
  PLAN_ERROR: 'nativeVulnScannerPlanError',
  CONFIRM_MODAL: 'nativeVulnScannerConfirmModal',
  CONFIRM_PACK_ACTION: 'nativeVulnScannerConfirmPackAction',
  CONFIRM_BUTTON: 'nativeVulnScannerConfirmButton',
  CANCEL_BUTTON: 'nativeVulnScannerCancelButton',
  APPLY_ERROR: 'nativeVulnScannerApplyError',
  APPLY_RESULTS: 'nativeVulnScannerApplyResults',
  APPLY_PACK_RESULT: 'nativeVulnScannerApplyPackResult',
  APPLY_LIVE_QUERY_RESULT: 'nativeVulnScannerApplyLiveQueryResult',
  LAST_SCAN_PANEL: 'nativeVulnScannerLastScanPanel',
  VIEW_RUN_LINK: 'nativeVulnScannerViewRunLink',
  NO_SCAN_YET: 'nativeVulnScannerNoScanYet',
  SCAN_FEEDS_TABLE: 'nativeVulnScannerScanFeedsTable',
  SCHEDULE_SWITCH: 'nativeVulnScannerScheduleSwitch',
  SCAN_NOW_BUTTON: 'nativeVulnScannerScanNowButton',
  SCAN_ERROR: 'nativeVulnScannerScanError',
  SCAN_RUNNING: 'nativeVulnScannerScanRunning',
  SCAN_FINISHED: 'nativeVulnScannerScanFinished',
  SCHEDULE_ERROR: 'nativeVulnScannerScheduleError',
} as const;

export const getPolicyRowTestSubject = (policyId: string, column: string) =>
  `nativeVulnScannerPolicy-${policyId}-${column}`;
export const getCollectInventoryTestSubject = (policyId: string) =>
  getPolicyRowTestSubject(policyId, 'collect');
export const getConfirmPolicyTestSubject = (policyId: string) =>
  `nativeVulnScannerConfirmPolicy-${policyId}`;
export const getApplyPolicyTestSubject = (policyId: string) =>
  `nativeVulnScannerApplyPolicy-${policyId}`;
