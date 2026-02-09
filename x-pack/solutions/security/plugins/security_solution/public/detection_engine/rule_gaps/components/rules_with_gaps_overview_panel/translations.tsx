/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_GAPS_OVERVIEW_PANEL_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleGaps.overviewPanel.label',
  {
    defaultMessage: 'Rules with gaps',
  }
);

export const RULE_MONITORING_OVERVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleGaps.overviewPanel.title',
  {
    defaultMessage: 'Rule Monitoring Overview',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_TOOLTIP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleGaps.overviewPanel.tooltip',
  {
    defaultMessage: 'Rules with gaps / rules with gaps being filled',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.autoGapFillStatusLabel',
  {
    defaultMessage: 'Auto gap fill status:',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_ON = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.autoGapFillStatusOn',
  {
    defaultMessage: 'On',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_OFF = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.autoGapFillStatusOff',
  {
    defaultMessage: 'Off',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_LOADING = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.autoGapFillStatusLoading',
  {
    defaultMessage: 'Loading',
  }
);

export const LAST_RESPONSE_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastResponseSummary.title',
  {
    defaultMessage: 'Last response summary',
  }
);

export const LAST_RESPONSE_SUMMARY_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastResponseSummary.label',
  {
    defaultMessage: 'Rules',
  }
);

export const LAST_RESPONSE_SUCCEEDED = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastResponseSummary.succeeded',
  {
    defaultMessage: 'Succeeded',
  }
);

export const LAST_RESPONSE_WARNING = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastResponseSummary.warning',
  {
    defaultMessage: 'Warning',
  }
);

export const LAST_RESPONSE_FAILED = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastResponseSummary.failed',
  {
    defaultMessage: 'Failed',
  }
);

export const LAST_RESPONSE_NO_RESPONSE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastResponseSummary.noResponse',
  {
    defaultMessage: 'No response',
  }
);

// Rule Gap Summary translations
export const RULE_GAP_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.ruleGapSummary.title',
  {
    defaultMessage: 'Rule gap summary',
  }
);

export const RULE_GAP_SUMMARY_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.ruleGapSummary.label',
  {
    defaultMessage: 'Total duration',
  }
);

export const GAP_STATUS_FILLED = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.ruleGapSummary.filled',
  {
    defaultMessage: 'Filled',
  }
);

export const GAP_STATUS_IN_PROGRESS = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.ruleGapSummary.inProgress',
  {
    defaultMessage: 'In progress',
  }
);

export const GAP_STATUS_UNFILLED = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.ruleGapSummary.unfilled',
  {
    defaultMessage: 'Unfilled',
  }
);

// Table column headers
export const TABLE_COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.table.status',
  {
    defaultMessage: 'Status',
  }
);

export const TABLE_COLUMN_RULES = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.table.rules',
  {
    defaultMessage: 'Rules',
  }
);

export const TABLE_COLUMN_DURATION = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.table.duration',
  {
    defaultMessage: 'Total duration',
  }
);

// Error messages
export const ERROR_LOADING_DATA = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.error.loadingData',
  {
    defaultMessage: 'Unable to load data',
  }
);

export const ERROR_LAST_RESPONSE_SUMMARY = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.error.lastResponseSummary',
  {
    defaultMessage: 'Failed to load last response summary. Please try again later.',
  }
);

export const ERROR_RULE_GAP_SUMMARY = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.error.ruleGapSummary',
  {
    defaultMessage: 'Failed to load gap summary. Please try again later.',
  }
);
