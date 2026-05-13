/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// ---------------------------------------------------------------------------
// Health Overview Cards
// ---------------------------------------------------------------------------

export const TOTAL_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.totalRules',
  { defaultMessage: 'Total Rules' }
);

export const ENABLED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.enabledRules',
  { defaultMessage: 'Enabled Rules' }
);

export const DISABLED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.disabledRules',
  { defaultMessage: 'Disabled Rules' }
);

export const ENABLED_PERCENTAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.enabledPercentage',
  { defaultMessage: 'Enabled %' }
);

export const TOTAL_EXECUTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.totalExecutions',
  { defaultMessage: 'Total Executions' }
);

export const FAILURES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.failures',
  { defaultMessage: 'Failures' }
);

export const WARNINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.warnings',
  { defaultMessage: 'Warnings' }
);

export const DETECTED_GAPS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.detectedGaps',
  { defaultMessage: 'Detected Gaps' }
);

export const SEARCH_DURATION_P95 = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.p95SearchDuration',
  { defaultMessage: 'p95 Search Duration' }
);

export const SCHEDULE_DELAY_P95 = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.p95ScheduleDelay',
  { defaultMessage: 'p95 Schedule Delay' }
);

// ---------------------------------------------------------------------------
// Rules by Type Bar
// ---------------------------------------------------------------------------

export const NO_RULE_TYPES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noRuleTypesTitle',
  { defaultMessage: 'No rule types' }
);

export const NO_RULE_TYPES_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noRuleTypesBody',
  { defaultMessage: 'No rule type data available.' }
);

export const RULES_SERIES_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.rulesSeriesName',
  { defaultMessage: 'Rules' }
);

// ---------------------------------------------------------------------------
// Logged Messages Bar
// ---------------------------------------------------------------------------

export const NO_LOGGED_MESSAGES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noLoggedMessagesTitle',
  { defaultMessage: 'No logged messages' }
);

export const NO_LOGGED_MESSAGES_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noLoggedMessagesBody',
  { defaultMessage: 'No logged messages in the selected interval.' }
);

export const LOG_MESSAGES_CATEGORY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.logMessagesCategory',
  { defaultMessage: 'Log Messages' }
);

// ---------------------------------------------------------------------------
// Performance Section
// ---------------------------------------------------------------------------

export const METRIC_COLUMN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.metricColumn',
  { defaultMessage: 'Metric' }
);

export const EXECUTION_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.executionDuration',
  { defaultMessage: 'Execution Duration' }
);

export const SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.searchDuration',
  { defaultMessage: 'Search Duration' }
);

export const INDEXING_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.indexingDuration',
  { defaultMessage: 'Indexing Duration' }
);

export const SCHEDULE_DELAY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.scheduleDelay',
  { defaultMessage: 'Schedule Delay' }
);

export const PERFORMANCE_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.performanceTableCaption',
  { defaultMessage: 'Performance Percentiles' }
);

// ---------------------------------------------------------------------------
// Gaps & Frozen
// ---------------------------------------------------------------------------

export const TOTAL_DETECTED_GAPS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.totalDetectedGaps',
  { defaultMessage: 'Total Detected Gaps' }
);

export const TOTAL_GAP_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.totalGapDuration',
  { defaultMessage: 'Total Gap Duration' }
);

export const FROZEN_INDICES_QUERIED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.frozenIndicesQueried',
  { defaultMessage: 'Frozen Indices Queried (Max)' }
);

// ---------------------------------------------------------------------------
// Top Messages
// ---------------------------------------------------------------------------

export const MESSAGE_COLUMN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.messageColumn',
  { defaultMessage: 'Message' }
);

export const COUNT_COLUMN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.countColumn',
  { defaultMessage: 'Count' }
);

export const TOP_ERRORS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.topErrorsTitle',
  { defaultMessage: 'Top Errors' }
);

export const TOP_WARNINGS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.topWarningsTitle',
  { defaultMessage: 'Top Warnings' }
);

export const NO_ERRORS_RECORDED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noErrorsRecorded',
  { defaultMessage: 'No errors recorded.' }
);

export const NO_WARNINGS_RECORDED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noWarningsRecorded',
  { defaultMessage: 'No warnings recorded.' }
);

// ---------------------------------------------------------------------------
// Historical Trends
// ---------------------------------------------------------------------------

export const NO_HISTORICAL_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noHistoricalDataTitle',
  { defaultMessage: 'No historical data' }
);

export const NO_HISTORICAL_DATA_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.noHistoricalDataBody',
  { defaultMessage: 'Historical buckets are not available for the selected interval.' }
);

export const EXECUTIONS_OVER_TIME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.executionsOverTime',
  { defaultMessage: 'Executions Over Time' }
);

export const TOTAL_SERIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.totalSeries',
  { defaultMessage: 'Total' }
);

export const FAILED_SERIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.failedSeries',
  { defaultMessage: 'Failed' }
);

export const P95_DELAY_OVER_TIME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.p95DelayOverTime',
  { defaultMessage: 'p95 Schedule Delay Over Time' }
);

export const P95_DELAY_SERIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.p95DelaySeries',
  { defaultMessage: 'p95 Delay (ms)' }
);

export const GAPS_OVER_TIME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.gapsOverTime',
  { defaultMessage: 'Detected Gaps Over Time' }
);

export const GAPS_SERIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.gapsSeries',
  { defaultMessage: 'Gaps' }
);

// ---------------------------------------------------------------------------
// Health Interval Filter
// ---------------------------------------------------------------------------

export const INTERVAL_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.intervalTypeLabel',
  { defaultMessage: 'Time range' }
);

export const GRANULARITY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.granularityLabel',
  { defaultMessage: 'Granularity' }
);

export const FROM_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.fromLabel',
  { defaultMessage: 'From' }
);

export const TO_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.toLabel',
  { defaultMessage: 'To' }
);

export const LAST_HOUR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.lastHour',
  { defaultMessage: 'Last hour' }
);

export const LAST_24_HOURS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.last24Hours',
  { defaultMessage: 'Last 24 hours' }
);

export const LAST_WEEK = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.lastWeek',
  { defaultMessage: 'Last week' }
);

export const LAST_MONTH = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.lastMonth',
  { defaultMessage: 'Last month' }
);

export const LAST_YEAR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.lastYear',
  { defaultMessage: 'Last year' }
);

export const CUSTOM_RANGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.customRange',
  { defaultMessage: 'Custom range' }
);

export const GRANULARITY_MINUTE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.granularityMinute',
  { defaultMessage: 'Minute' }
);

export const GRANULARITY_HOUR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.granularityHour',
  { defaultMessage: 'Hour' }
);

export const GRANULARITY_DAY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.granularityDay',
  { defaultMessage: 'Day' }
);

export const GRANULARITY_WEEK = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.granularityWeek',
  { defaultMessage: 'Week' }
);

export const GRANULARITY_MONTH = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.healthOverview.granularityMonth',
  { defaultMessage: 'Month' }
);
