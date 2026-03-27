/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.tableCaption',
  {
    defaultMessage: 'Execution results',
  }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.statusColumn',
  {
    defaultMessage: 'Status',
  }
);

export const COLUMN_STATUS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.statusColumnTooltip',
  {
    defaultMessage: 'Overall status of execution.',
  }
);

export const COLUMN_RUN_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.runTypeColumn',
  {
    defaultMessage: 'Run type',
  }
);

export const COLUMN_RUN_TYPE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.runTypeColumnTooltip',
  {
    defaultMessage: 'Whether this was a standard scheduled execution or a manual backfill run.',
  }
);

export const COLUMN_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.timestampColumn',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_TIMESTAMP_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.timestampColumnTooltip',
  {
    defaultMessage: 'Datetime rule execution initiated.',
  }
);

export const COLUMN_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.durationColumn',
  {
    defaultMessage: 'Execution duration',
  }
);

export const COLUMN_DURATION_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.durationColumnTooltip',
  {
    defaultMessage: 'The length of time it took for the rule to run (hh:mm:ss:SSS).',
  }
);

export const COLUMN_ALERTS_CREATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.alertsCreatedColumn',
  {
    defaultMessage: 'Alerts created',
  }
);

export const COLUMN_ALERTS_CREATED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.alertsCreatedColumnTooltip',
  {
    defaultMessage: 'Number of new alerts generated during this execution.',
  }
);

export const COLUMN_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.messageColumn',
  {
    defaultMessage: 'Message',
  }
);

export const COLUMN_MESSAGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.messageColumnTooltip',
  {
    defaultMessage: 'Relevant message from execution outcome.',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.actionsColumn',
  {
    defaultMessage: 'Actions',
  }
);

export const ACTION_FILTER_BY_EXECUTION_ID = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.actionFilterByExecutionId',
  {
    defaultMessage: 'Filter alerts by rule execution ID',
  }
);

export const ACTION_FILTER_BY_EXECUTION_ID_DISABLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.actionFilterByExecutionIdDisabled',
  {
    defaultMessage: 'No alerts were created during this run',
  }
);

export const ACTION_VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.actionViewDetails',
  {
    defaultMessage: 'View details',
  }
);

export const FLYOUT_TITLE = (executionId: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTitle',
    {
      defaultMessage: 'Execution ID: {executionId}',
      values: { executionId },
    }
  );

export const FLYOUT_COPY_EXECUTION_ID = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutCopyExecutionId',
  {
    defaultMessage: 'Copy full execution ID',
  }
);

export const FLYOUT_HEADER_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutHeaderStatus',
  {
    defaultMessage: 'Status',
  }
);

export const FLYOUT_HEADER_RUN_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutHeaderRunType',
  {
    defaultMessage: 'Run type',
  }
);

export const FLYOUT_SOURCE_EVENT_TIME_RANGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutSourceEventTimeRange',
  {
    defaultMessage: 'Source event time range',
  }
);

export const FLYOUT_GAP_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutGapDuration',
  {
    defaultMessage: 'Gap duration',
  }
);

export const FLYOUT_INDEX_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutIndexDuration',
  {
    defaultMessage: 'Indexing: Total',
  }
);

export const FLYOUT_SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutSearchDuration',
  {
    defaultMessage: 'Search',
  }
);

export const FLYOUT_SCHEDULING_DELAY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutSchedulingDelay',
  {
    defaultMessage: 'Scheduling delay',
  }
);

export const FLYOUT_MATCHED_INDICES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutMatchedIndices',
  {
    defaultMessage: 'Matched indices',
  }
);

export const FLYOUT_CANDIDATE_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutCandidateAlerts',
  {
    defaultMessage: 'Candidate alerts',
  }
);

export const FLYOUT_FROZEN_INDICES_QUERIED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutFrozenIndicesQueried',
  {
    defaultMessage: 'Frozen indices queried',
  }
);

export const FLYOUT_ALERT_INDEX_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAlertIndexDuration',
  {
    defaultMessage: 'Indexing: Alerts',
  }
);

export const FLYOUT_ACCORDION_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionMessage',
  {
    defaultMessage: 'Message',
  }
);

export const FLYOUT_ACCORDION_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionAlerts',
  {
    defaultMessage: 'Alerts',
  }
);

export const FLYOUT_TOOLTIP_ALERTS_CREATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipAlertsCreated',
  {
    defaultMessage: 'Number of new alerts generated during this execution.',
  }
);

export const FLYOUT_TOOLTIP_CANDIDATE_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipCandidateAlerts',
  {
    defaultMessage:
      'Number of events that matched the rule query before deduplication and filtering.',
  }
);

export const FLYOUT_ALERTS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAlertsLabel',
  {
    defaultMessage: 'Alerts',
  }
);

export const FLYOUT_ACCORDION_DURATION_BREAKDOWN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionDurationBreakdown',
  {
    defaultMessage: 'Execution duration breakdown',
  }
);

export const FLYOUT_TOOLTIP_SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipSearchDuration',
  {
    defaultMessage: 'The length of time it took to search for alerts (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_TOOLTIP_INDEXING_TOTAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipIndexingTotal',
  {
    defaultMessage: 'The length of time it took to index detected alerts (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_TOOLTIP_INDEXING_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipIndexingAlerts',
  {
    defaultMessage:
      'The length of time it took to index alerts into the alerts index (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_ACCORDION_EXECUTION_METRICS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionExecutionMetrics',
  {
    defaultMessage: 'Timing',
  }
);

export const FLYOUT_TOOLTIP_GAP_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipGapDuration',
  {
    defaultMessage:
      'Duration of gap in rule execution. Adjust rule look-back or see documentation for mitigating gaps.',
  }
);

export const FLYOUT_TOOLTIP_SCHEDULING_DELAY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipSchedulingDelay',
  {
    defaultMessage: 'The length of time from rule scheduled till rule executed (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_TOOLTIP_EXECUTION_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipExecutionDuration',
  {
    defaultMessage: 'The length of time it took for the rule to run (hh:mm:ss:SSS).',
  }
);

export const FLYOUT_ACCORDION_SOURCE_EVENT_TIME_RANGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionSourceEventTimeRange',
  {
    defaultMessage: 'Source event time range',
  }
);

export const FLYOUT_TOOLTIP_FROM = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipFrom',
  {
    defaultMessage: 'Start of the source event time range queried by this execution.',
  }
);

export const FLYOUT_TOOLTIP_TO = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipTo',
  {
    defaultMessage: 'End of the source event time range queried by this execution.',
  }
);

export const FLYOUT_FROM = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutFrom',
  {
    defaultMessage: 'From',
  }
);

export const FLYOUT_TO = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTo',
  {
    defaultMessage: 'To',
  }
);

export const FLYOUT_ACCORDION_INDICES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionIndices',
  {
    defaultMessage: 'Indices',
  }
);

export const FLYOUT_TOOLTIP_MATCHED_INDICES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipMatchedIndices',
  {
    defaultMessage: 'Number of indices that contained matching source events.',
  }
);

export const FLYOUT_TOOLTIP_FROZEN_INDICES_QUERIED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutTooltipFrozenIndicesQueried',
  {
    defaultMessage: 'Number of frozen-tier indices included in the search.',
  }
);
