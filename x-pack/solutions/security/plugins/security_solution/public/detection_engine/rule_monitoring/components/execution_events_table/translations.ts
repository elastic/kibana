/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.tableTitle',
  {
    defaultMessage: 'Execution events',
  }
);

export const TABLE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.tableSubtitle',
  {
    defaultMessage: 'A detailed log of rule execution events',
  }
);

export const COLUMN_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.timestampColumn',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_LOG_LEVEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.logLevelColumn',
  {
    defaultMessage: 'Level',
  }
);

export const COLUMN_EVENT_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.eventTypeColumn',
  {
    defaultMessage: 'Type',
  }
);

export const COLUMN_SUMMARY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.summaryColumn',
  {
    defaultMessage: 'Summary',
  }
);

export const FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.fetchErrorDescription',
  {
    defaultMessage: 'Failed to fetch rule execution events',
  }
);

export const EVENT_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.eventMessageTitle',
  {
    defaultMessage: 'Event message',
  }
);

export const STATUS_CHANGED_TO = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.statusChangedTo',
  {
    defaultMessage: 'Status changed to',
  }
);

export const GAP_DURATION = (durationSeconds: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.gapDuration',
    {
      defaultMessage: 'Gap duration: {durationSeconds}s',
      values: { durationSeconds },
    }
  );

export const SEARCH_DURATION = (durationMs: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.searchDuration',
    {
      defaultMessage: 'Search duration: {durationMs}ms',
      values: { durationMs },
    }
  );

export const INDEXING_DURATION = (durationMs: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.indexingDuration',
    {
      defaultMessage: 'Indexing duration: {durationMs}ms',
      values: { durationMs },
    }
  );

export const METRICS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.metricsTitle',
  {
    defaultMessage: 'Metrics',
  }
);

export const RULE_EXECUTION_ID = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.ruleExecutionIdTitle',
  {
    defaultMessage: 'Rule execution ID',
  }
);
