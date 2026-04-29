/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GAP_AUTO_FILL_LOGS_TITLE = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.title',
  {
    defaultMessage: 'Gap fill scheduler logs',
  }
);

export const GAP_AUTO_FILL_RUN_TIME_COLUMN = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.runTimeColumn',
  {
    defaultMessage: 'Time',
  }
);

export const GAP_AUTO_FILL_GAPS_SCHEDULED_COLUMN = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.gapsScheduledColumn',
  {
    defaultMessage: 'Gaps scheduled to be filled',
  }
);

export const GAP_AUTO_FILL_STATUS_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusPanelTitle',
  {
    defaultMessage: 'Gap scheduler status',
  }
);

export const GAP_AUTO_FILL_RULES_PROCESSED_COLUMN = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.rulesProcessedColumn',
  {
    defaultMessage: 'Rules processed',
  }
);

export const GAP_AUTO_FILL_ON_LABEL = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.autoFillOnLabel',
  {
    defaultMessage: 'Auto fill on',
  }
);

export const GAP_AUTO_FILL_OFF_LABEL = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.autoFillOffLabel',
  {
    defaultMessage: 'Auto fill off',
  }
);

export const GAP_AUTO_FILL_EXPAND_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.expandRowAriaLabel',
  {
    defaultMessage: 'Expand row',
  }
);

export const GAP_AUTO_FILL_COLLAPSE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.collapseRowAriaLabel',
  {
    defaultMessage: 'Collapse row',
  }
);

export const GAP_AUTO_FILL_REFRESH_LABEL = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.refreshLabel',
  {
    defaultMessage: 'Refresh',
  }
);

export const GAP_AUTO_FILL_STATUS_FILTER_TITLE = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusFilterTitle',
  {
    defaultMessage: 'Schedule status',
  }
);

export const GAP_AUTO_FILL_LOGS_STATUS_COLUMN = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.logsStatusColumn',
  {
    defaultMessage: 'Schedule status',
  }
);

export const GAP_AUTO_FILL_LOGS_VIEW_LOGS_BUTTON = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.viewLogsButton',
  {
    defaultMessage: 'View logs',
  }
);

export const GAP_AUTO_FILL_SCHEDULE_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.schedulePanelTitle',
  {
    defaultMessage: 'Gap scheduler schedule',
  }
);

export const GAP_AUTO_FILL_STATUS_SUCCESS = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSuccess',
  {
    defaultMessage: 'Success',
  }
);

export const GAP_AUTO_FILL_STATUS_ERROR = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusError',
  {
    defaultMessage: 'Error',
  }
);

export const GAP_AUTO_FILL_STATUS_SKIPPED = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkipped',
  {
    defaultMessage: 'Skipped',
  }
);

export const GAP_AUTO_FILL_LOGS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.calloutTitle',
  {
    defaultMessage: 'About the scheduler logs',
  }
);

export const GAP_AUTO_FILL_STATUS_NO_GAPS = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusNoGaps',
  {
    defaultMessage: 'No gaps',
  }
);

// Success tooltips
export const GAP_AUTO_FILL_STATUS_SUCCESS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSuccessTooltip',
  {
    defaultMessage: 'Gap fill tasks were scheduled successfully for processed rules.',
  }
);

// Error tooltips
export const GAP_AUTO_FILL_STATUS_ERROR_ALL_FAILED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusErrorAllFailedTooltip',
  {
    defaultMessage: 'Gap fill tasks could not be scheduled for rules.',
  }
);

export const getGapAutoFillStatusErrorSomeSucceededTooltip = (successCount: number): string =>
  i18n.translate('xpack.securitySolution.gapAutoFillLogs.statusErrorSomeFailedTooltip', {
    defaultMessage:
      'Gap fill tasks were successfully scheduled for {successCount} {successCount, plural, one {rule} other {rules}}. Tasks could not be scheduled for the other rules.',
    values: { successCount },
  });

export const GAP_AUTO_FILL_STATUS_ERROR_TASK_CRASH_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusErrorTaskCrashTooltip',
  {
    defaultMessage:
      'An error caused the gap fill task to crash. For troubleshooting tips, refer to the documentation.',
  }
);

export const GAP_AUTO_FILL_STATUS_ERROR_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusErrorTooltip',
  {
    defaultMessage:
      'Gap fill tasks for some or all rules were not scheduled due to an error during task execution.',
  }
);

// Skipped tooltips
export const GAP_AUTO_FILL_STATUS_SKIPPED_NO_CAPACITY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkippedNoCapacityTooltip',
  {
    defaultMessage:
      'Tasks could not be scheduled because the limit for scheduled gap fill tasks has been met.',
  }
);

export const GAP_AUTO_FILL_STATUS_SKIPPED_RULES_DISABLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkippedRulesDisabledTooltip',
  {
    defaultMessage: 'Disabled rules have unfilled gaps. Enable them to schedule gap fill tasks.',
  }
);

export const getGapAutoFillStatusSkippedSomeSucceededTooltip = (successCount: number): string =>
  i18n.translate('xpack.securitySolution.gapAutoFillLogs.statusSkippedSomeSucceededTooltip', {
    defaultMessage:
      'Gap fill tasks for {successCount} {successCount, plural, one {rule} other {rules}} were successfully scheduled. Tasks for other rules were not scheduled because the task limit has been met.',
    values: { successCount },
  });

export const GAP_AUTO_FILL_STATUS_SKIPPED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkippedTooltip',
  {
    defaultMessage:
      'Gap fill tasks cannot be scheduled because the max limit of tasks has been met or some rules are disabled.',
  }
);

// No gaps tooltip
export const GAP_AUTO_FILL_STATUS_NO_GAPS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusNoGapsTooltip',
  {
    defaultMessage: "Gaps in rule executions don't currently exist.",
  }
);
