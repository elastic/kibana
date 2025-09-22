/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BACKFILLS_TABLE_COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.status',
  {
    defaultMessage: 'Status',
  }
);

export const BACKFILLS_TABLE_COLUMN_STATUS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.statusTooltip',
  {
    defaultMessage: 'Overall status of execution',
  }
);

export const BACKFILLS_TABLE_COLUMN_CREATED_AT = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.createdAt',
  {
    defaultMessage: 'Created at',
  }
);

export const BACKFILLS_TABLE_COLUMN_CREATED_AT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.createdAtTooltip',
  {
    defaultMessage: 'When the manual run started',
  }
);

export const BACKFILLS_TABLE_COLUMN_SOURCE_TIME_RANGE = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.sourceTimeRange',
  {
    defaultMessage: 'Source event time range',
  }
);

export const BACKFILLS_TABLE_COLUMN_SOURCE_TIME_RANGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.sourceTimeRangeTooltip',
  {
    defaultMessage: 'The date and time range selected for the manual run',
  }
);

export const BACKFILLS_TABLE_COLUMN_ERROR = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.error',
  {
    defaultMessage: 'Error',
  }
);

export const BACKFILLS_TABLE_COLUMN_ERROR_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.errorTooltip',
  {
    defaultMessage: 'The number of failed manual run rule executions',
  }
);

export const BACKFILLS_TABLE_COLUMN_COMPLETED = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.completed',
  {
    defaultMessage: 'Completed',
  }
);

export const BACKFILLS_TABLE_COLUMN_COMPLETED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.completedTooltip',
  {
    defaultMessage: 'The number of completed manual run rule executions',
  }
);

export const BACKFILLS_TABLE_COLUMN_RUNNING = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.running',
  {
    defaultMessage: 'Running',
  }
);

export const BACKFILLS_TABLE_COLUMN_RUNNING_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.runningTooltip',
  {
    defaultMessage: 'The number of manual run rule executions that are in progress',
  }
);

export const BACKFILLS_TABLE_COLUMN_PENDING = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.pending',
  {
    defaultMessage: 'Pending',
  }
);

export const BACKFILLS_TABLE_COLUMN_PENDING_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.pendingTooltip',
  {
    defaultMessage: 'The number of manual run rule executions that are waiting to execute',
  }
);

export const BACKFILLS_TABLE_COLUMN_TOTAL = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.total',
  {
    defaultMessage: 'Total',
  }
);

export const BACKFILLS_TABLE_COLUMN_TOTAL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.totalTooltip',
  {
    defaultMessage:
      'The total number of rule executions that will occur during the selected date and time range',
  }
);

export const BACKFILLS_TABLE_STOP = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.stop',
  {
    defaultMessage: 'Stop run',
  }
);

export const BACKFILLS_TABLE_STOP_CONFIRMATION_TITLE = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.stop.confirmationTitle',
  {
    defaultMessage: 'Stop this rule run',
  }
);

export const BACKFILLS_TABLE_STOP_CONFIRMATION_CANCEL = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.stop.cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const BACKFILLS_TABLE_STOP_CONFIRMATION_STOP_RUNS = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.stop.stopRuns',
  {
    defaultMessage: 'Stop run',
  }
);

export const BACKFILLS_TABLE_STOP_CONFIRMATION_BODY = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.stop.description',
  {
    defaultMessage: 'All the pending rule executions for this manual rule run will be stopped',
  }
);

export const BACKFILLS_TABLE_STOP_CONFIRMATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.stop.confirmationSuccess',
  {
    defaultMessage: 'Rule run stopped',
  }
);

export const BACKFILLS_TABLE_STOP_CONFIRMATION_ERROR = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.stop.confirmationError',
  {
    defaultMessage: 'Error stopping rule run',
  }
);

export const BACKFILL_TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillTable.title',
  {
    defaultMessage: 'Manual runs',
  }
);

export const BACKFILL_TABLE_REFRESH = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillTable.refresh',
  {
    defaultMessage: 'Refresh',
  }
);

export const BACKFILL_TABLE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillTable.subtitle',
  {
    defaultMessage: 'View and manage active manual runs',
  }
);

export const BACKFILL_SCHEDULE_SUCCESS = (numRules: number) =>
  i18n.translate(
    'xpack.securitySolution.containers.detectionEngine.backfillSchedule.scheduleRuleRunSuccessTitle',
    {
      values: { numRules },
      defaultMessage:
        'Successfully scheduled manual run for {numRules, plural, =1 {# rule} other {# rules}}',
    }
  );

export const BACKFILL_SCHEDULE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.backfillSchedule.scheduleRuleRunErrorTitle',
  {
    defaultMessage: 'Error while scheduling manual run',
  }
);

export const BACKFILLS_TABLE_COLUMN_ACTION = i18n.translate(
  'xpack.securitySolution.rule_gaps.backfillsTable.column.action',
  {
    defaultMessage: 'Action',
  }
);

// Rule Settings modal
export const RULE_SETTINGS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.title',
  {
    defaultMessage: 'Rule settings',
  }
);

export const AUTO_GAP_FILL_HEADER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.autoGapFillHeader',
  {
    defaultMessage: 'Auto gap fill settings',
  }
);

export const AUTO_GAP_FILL_TOGGLE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.autoGapFillToggle',
  {
    defaultMessage: 'Enable auto gap fill',
  }
);

export const AUTO_GAP_FILL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.autoGapFillDescription',
  {
    defaultMessage: 'Detected run gaps will be automatically filled.',
  }
);

export const RUN_SCHEDULE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.runScheduleLabel',
  {
    defaultMessage: 'Run schedule',
  }
);

export const SCHEDULE_UNIT_MINUTES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.scheduleMinutes',
  {
    defaultMessage: 'minutes',
  }
);

export const SCHEDULE_UNIT_HOURS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.scheduleHours',
  {
    defaultMessage: 'hours',
  }
);

export const SCHEDULE_UNIT_DAYS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.scheduleDays',
  {
    defaultMessage: 'days',
  }
);

export const SCHEDULE_UNIT_SECONDS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleSettings.scheduleSeconds',
  {
    defaultMessage: 'seconds',
  }
);

export const SAVE = i18n.translate('xpack.securitySolution.detectionEngine.ruleSettings.save', {
  defaultMessage: 'Save',
});

export const CANCEL = i18n.translate('xpack.securitySolution.detectionEngine.ruleSettings.cancel', {
  defaultMessage: 'Cancel',
});
