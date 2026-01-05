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
    defaultMessage: 'Task skipped',
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
    defaultMessage: 'All rules successfully scheduled.',
  }
);

// Error tooltips
export const GAP_AUTO_FILL_STATUS_ERROR_ALL_FAILED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusErrorAllFailedTooltip',
  {
    defaultMessage: 'All rules failed to schedule.',
  }
);

export const GAP_AUTO_FILL_STATUS_ERROR_SOME_SUCCEEDED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusErrorSomeFailedTooltip',
  {
    defaultMessage: 'At least 1 rule successfully scheduled, but other failed to schedule.',
  }
);

export const GAP_AUTO_FILL_STATUS_ERROR_TASK_CRASH_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusErrorTaskCrashTooltip',
  {
    defaultMessage: 'An error occurred during task execution that caused the task to crash.',
  }
);

export const GAP_AUTO_FILL_STATUS_ERROR_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusErrorTooltip',
  {
    defaultMessage: 'Some or all rules failed to schedule due to an error during task execution.',
  }
);

// Skipped tooltips
export const GAP_AUTO_FILL_STATUS_SKIPPED_NO_CAPACITY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkippedNoCapacityTooltip',
  {
    defaultMessage: 'No capacity to schedule more backfills.',
  }
);

export const GAP_AUTO_FILL_STATUS_SKIPPED_RULES_DISABLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkippedRulesDisabledTooltip',
  {
    defaultMessage: 'There are unfilled gaps, but rules are disabled.',
  }
);

export const GAP_AUTO_FILL_STATUS_SKIPPED_SOME_SUCCEEDED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkippedSomeSucceededTooltip',
  {
    defaultMessage: 'At least 1 rule successfully scheduled. No capacity to schedule more backfills.',
  }
);

export const GAP_AUTO_FILL_STATUS_SKIPPED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusSkippedTooltip',
  {
    defaultMessage: 'No capacity to schedule more backfills or some rules are disabled.',
  }
);

// No gaps tooltip
export const GAP_AUTO_FILL_STATUS_NO_GAPS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapAutoFillLogs.statusNoGapsTooltip',
  {
    defaultMessage: 'No gaps with unfilled intervals present in the system.',
  }
);
