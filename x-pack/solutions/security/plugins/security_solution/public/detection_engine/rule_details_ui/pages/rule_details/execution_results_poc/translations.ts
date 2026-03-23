/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.statusColumn',
  {
    defaultMessage: 'Status',
  }
);

export const COLUMN_RUN_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.runTypeColumn',
  {
    defaultMessage: 'Run type',
  }
);

export const COLUMN_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.timestampColumn',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.durationColumn',
  {
    defaultMessage: 'Duration',
  }
);

export const COLUMN_ALERTS_CREATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.alertsCreatedColumn',
  {
    defaultMessage: 'Alerts created',
  }
);

export const COLUMN_MATCHED_EVENTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.matchedEventsColumn',
  {
    defaultMessage: 'Matched events',
  }
);

export const COLUMN_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.messageColumn',
  {
    defaultMessage: 'Message',
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
      defaultMessage: 'Execution ID {executionId}',
      values: { executionId },
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
    defaultMessage: 'Index duration',
  }
);

export const FLYOUT_SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutSearchDuration',
  {
    defaultMessage: 'Search duration',
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
    defaultMessage: 'Alert index duration',
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

export const FLYOUT_ALERTS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAlertsLabel',
  {
    defaultMessage: 'Alerts',
  }
);

export const FLYOUT_ACCORDION_DURATION_BREAKDOWN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionDurationBreakdown',
  {
    defaultMessage: 'Duration breakdown',
  }
);

export const FLYOUT_ACCORDION_EXECUTION_METRICS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutAccordionExecutionMetrics',
  {
    defaultMessage: 'Execution metrics',
  }
);

export const FLYOUT_EXECUTION_TIME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutExecutionTime',
  {
    defaultMessage: 'Execution time',
  }
);

export const FLYOUT_EVENTS_MATCHED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutEventsMatched',
  {
    defaultMessage: 'Events matched',
  }
);

export const FLYOUT_GAP_DETECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.executionResultsPoc.flyoutGapDetected',
  {
    defaultMessage: 'Gap detected',
  }
);
