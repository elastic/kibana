/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.tableCaption',
  {
    defaultMessage: 'Execution results',
  }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.statusColumn',
  {
    defaultMessage: 'Status',
  }
);

export const COLUMN_STATUS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.statusColumnTooltip',
  {
    defaultMessage: 'Overall status of execution.',
  }
);

export const COLUMN_RUN_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.runTypeColumn',
  {
    defaultMessage: 'Run type',
  }
);

export const COLUMN_RUN_TYPE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.runTypeColumnTooltip',
  {
    defaultMessage: 'Whether this was a standard scheduled execution or a manual backfill run.',
  }
);

export const COLUMN_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.timestampColumn',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_TIMESTAMP_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.timestampColumnTooltip',
  {
    defaultMessage: 'Datetime rule execution initiated.',
  }
);

export const COLUMN_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.durationColumn',
  {
    defaultMessage: 'Execution duration',
  }
);

export const COLUMN_DURATION_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.durationColumnTooltip',
  {
    defaultMessage: 'The length of time it took for the rule to run (hh:mm:ss:SSS).',
  }
);

export const COLUMN_ALERTS_CREATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.alertsCreatedColumn',
  {
    defaultMessage: 'Alerts created',
  }
);

export const COLUMN_ALERTS_CREATED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.alertsCreatedColumnTooltip',
  {
    defaultMessage: 'Number of new alerts generated during this execution.',
  }
);

export const COLUMN_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.messageColumn',
  {
    defaultMessage: 'Message',
  }
);

export const COLUMN_MESSAGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.messageColumnTooltip',
  {
    defaultMessage: 'Relevant message from execution outcome.',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.actionsColumn',
  {
    defaultMessage: 'Actions',
  }
);

export const ACTION_FILTER_BY_EXECUTION_ID = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.actionFilterByExecutionId',
  {
    defaultMessage: 'Filter alerts by rule execution ID',
  }
);

export const ACTION_FILTER_BY_EXECUTION_ID_DISABLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.actionFilterByExecutionIdDisabled',
  {
    defaultMessage: 'No alerts were created during this run',
  }
);

export const ACTION_VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.actionViewDetails',
  {
    defaultMessage: 'View details',
  }
);

export const FLYOUT_TITLE = (executionId: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTitle',
    {
      defaultMessage: 'Execution ID: {executionId}',
      values: { executionId },
    }
  );

export const FLYOUT_COPY_EXECUTION_ID = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutCopyExecutionId',
  {
    defaultMessage: 'Copy full execution ID',
  }
);

export const FLYOUT_HEADER_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutHeaderStatus',
  {
    defaultMessage: 'Status',
  }
);

export const FLYOUT_HEADER_RUN_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutHeaderRunType',
  {
    defaultMessage: 'Run type',
  }
);

export const FLYOUT_SOURCE_EVENT_TIME_RANGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutSourceEventTimeRange',
  {
    defaultMessage: 'Source event time range',
  }
);

export const FLYOUT_GAP_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutGapDuration',
  {
    defaultMessage: 'Gap duration',
  }
);

export const FLYOUT_INDEX_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutIndexDuration',
  {
    defaultMessage: 'Indexing',
  }
);

export const FLYOUT_SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutSearchDuration',
  {
    defaultMessage: 'Search',
  }
);

export const FLYOUT_SCHEDULING_DELAY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutSchedulingDelay',
  {
    defaultMessage: 'Scheduling delay',
  }
);

export const FLYOUT_MATCHED_INDICES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutMatchedIndices',
  {
    defaultMessage: 'Matched indices',
  }
);

export const FLYOUT_CANDIDATE_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutCandidateAlerts',
  {
    defaultMessage: 'Candidate alerts',
  }
);

export const FLYOUT_FROZEN_INDICES_QUERIED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutFrozenIndicesQueried',
  {
    defaultMessage: 'Frozen indices queried',
  }
);

export const FLYOUT_ACCORDION_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutAccordionMessage',
  {
    defaultMessage: 'Message',
  }
);

export const FLYOUT_ACCORDION_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutAccordionAlerts',
  {
    defaultMessage: 'Alerts',
  }
);

export const FLYOUT_TOOLTIP_ALERTS_CREATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipAlertsCreated',
  {
    defaultMessage: 'Number of new alerts generated during this execution.',
  }
);

export const FLYOUT_TOOLTIP_CANDIDATE_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipCandidateAlerts',
  {
    defaultMessage:
      'Number of events that matched the rule query before deduplication and filtering.',
  }
);

export const FLYOUT_ALERTS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutAlertsLabel',
  {
    defaultMessage: 'Alerts',
  }
);

export const FLYOUT_ACCORDION_DURATION_BREAKDOWN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutAccordionDurationBreakdown',
  {
    defaultMessage: 'Execution duration breakdown',
  }
);

export const FLYOUT_TOOLTIP_SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipSearchDuration',
  {
    defaultMessage: 'The length of time it took to search for alerts (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_TOOLTIP_INDEXING_TOTAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipIndexingTotal',
  {
    defaultMessage: 'The length of time it took to index detected alerts (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_ACCORDION_EXECUTION_METRICS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutAccordionExecutionMetrics',
  {
    defaultMessage: 'Timing',
  }
);

export const FLYOUT_TOOLTIP_GAP_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipGapDuration',
  {
    defaultMessage:
      'Duration of gap in rule execution. Adjust rule look-back or see documentation for mitigating gaps.',
  }
);

export const FLYOUT_TOOLTIP_SCHEDULING_DELAY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipSchedulingDelay',
  {
    defaultMessage: 'The length of time from rule scheduled till rule executed (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_TOOLTIP_EXECUTION_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipExecutionDuration',
  {
    defaultMessage: 'The length of time it took for the rule to run (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_ACCORDION_SOURCE_EVENT_TIME_RANGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutAccordionSourceEventTimeRange',
  {
    defaultMessage: 'Source event time range',
  }
);

export const FLYOUT_TOOLTIP_FROM = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipFrom',
  {
    defaultMessage: 'Start of the source event time range queried by this execution.',
  }
);

export const FLYOUT_TOOLTIP_TO = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipTo',
  {
    defaultMessage: 'End of the source event time range queried by this execution.',
  }
);

export const FLYOUT_FROM = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutFrom',
  {
    defaultMessage: 'From',
  }
);

export const FLYOUT_TO = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTo',
  {
    defaultMessage: 'To',
  }
);

export const FLYOUT_ACCORDION_INDICES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutAccordionIndices',
  {
    defaultMessage: 'Indices',
  }
);

export const FLYOUT_TOOLTIP_MATCHED_INDICES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipMatchedIndices',
  {
    defaultMessage: 'Number of indices that contained matching source events.',
  }
);

export const FLYOUT_TOOLTIP_FROZEN_INDICES_QUERIED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResults.flyoutTooltipFrozenIndicesQueried',
  {
    defaultMessage: 'Number of frozen-tier indices included in the search.',
  }
);
