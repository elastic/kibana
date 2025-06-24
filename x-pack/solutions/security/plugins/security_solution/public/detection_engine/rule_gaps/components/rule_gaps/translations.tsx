/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const GAPS_TABLE_STATUS_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.statusLabel',
  {
    defaultMessage: 'Status',
  }
);

export const GAPS_TABLE_STATUS_LABEL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapsTable.statusLabelTooltip',
  {
    defaultMessage: 'Status of gap',
  }
);

export const GAPS_TABLE_ACTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.actionsLabel',
  {
    defaultMessage: 'Actions',
  }
);

export const GAP_STATUS_UNFILLED = i18n.translate(
  'xpack.securitySolution.gapsTable.gapStatus.unfilled',
  {
    defaultMessage: 'Unfilled',
  }
);

export const GAP_STATUS_PARTIALLY_FILLED = i18n.translate(
  'xpack.securitySolution.gapsTable.gapStatus.partiallyFilled',
  {
    defaultMessage: 'Partially filled',
  }
);

export const GAP_STATUS_FILLED = i18n.translate(
  'xpack.securitySolution.gapsTable.gapStatus.filled',
  {
    defaultMessage: 'Filled',
  }
);

export const GAPS_TABLE_MANUAL_FILL_TASKS_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.manualFillTasksLabel',
  {
    defaultMessage: 'Manual fill tasks',
  }
);

export const GAPS_TABLE_MANUAL_FILL_TASKS_LABEL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapsTable.manualFillTasksLabelTooltip',
  {
    defaultMessage: 'Status of manual run filling the gap',
  }
);

export const GAPS_TABLE_IN_PROGRESS_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.inProgressIntervalsLabel',
  {
    defaultMessage: 'In progress',
  }
);

export const GAPS_TABLE_EVENT_TIME_COVERED_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.eventTimeCoveredLabel',
  {
    defaultMessage: 'Event time covered',
  }
);

export const GAPS_TABLE_EVENT_TIME_COVERED_LABEL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapsTable.eventTimeCoveredLabelTooltip',
  {
    defaultMessage: 'Progress of manual run filling the gap',
  }
);

export const GAPS_TABLE_GAP_RANGE_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.gapRangeLabel',
  {
    defaultMessage: 'Range',
  }
);

export const GAPS_TABLE_GAP_RANGE_LABEL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapsTable.gapRangeLabelTooltip',
  {
    defaultMessage: 'Time range of gap',
  }
);

export const GAPS_TABLE_GAP_DURATION_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.gapDurationTooltip',
  {
    defaultMessage: 'Total gap duration',
  }
);

export const GAPS_TABLE_GAP_DURATION_LABEL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapsTable.gapDurationLabelTooltip',
  {
    defaultMessage: 'How long gap lasted',
  }
);

export const GAPS_TABLE_FILL_GAP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.fillGapButtonLabel',
  {
    defaultMessage: 'Fill gap',
  }
);

export const GAPS_TABLE_FILL_REMAINING_GAP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.fillRemainingGapButtonLabel',
  {
    defaultMessage: 'Fill remaining gap',
  }
);

export const GAP_FILL_REQUEST_SUCCESS_MESSAGE = i18n.translate(
  'xpack.securitySolution.gapsTable.gapFillRequestSuccessMessage',
  {
    defaultMessage: 'Manual run requested',
  }
);

export const GAP_FILL_REQUEST_SUCCESS_MESSAGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapsTable.gapFillRequestSuccessMessageTooltip',
  {
    defaultMessage: 'Check status in rule execution logs. Actions for this execution will be run.',
  }
);

export const GAP_FILL_REQUEST_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.gapsTable.gapFillRequestErrorMessage',
  {
    defaultMessage: 'Failed to request manual run',
  }
);

export const GAP_STATUS_FILTER_TITLE = i18n.translate(
  'xpack.securitySolution.gapsTable.gapStatusFilterTitle',
  {
    defaultMessage: 'Status',
  }
);

export const GAPS_TABLE_EVENT_TIME_LABEL = i18n.translate(
  'xpack.securitySolution.gapsTable.eventTimeLabel',
  {
    defaultMessage: 'Detected at',
  }
);

export const GAPS_TABLE_EVENT_TIME_LABEL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.gapsTable.eventTimeLabelTooltip',
  {
    defaultMessage: 'Date and time gap was discovered',
  }
);

export const GAP_FILL_DISABLED_MESSAGE = i18n.translate(
  'xpack.securitySolution.gapsTable.gapFillDisabledMessage',
  {
    defaultMessage: 'Rule should be enabled to fill gaps',
  }
);

export const GAPS_TABLE_TOTAL_GAPS_LABEL = (totalItems: number, maxItems: number) =>
  i18n.translate('xpack.securitySolution.gapsTable.totalGapsLabel', {
    values: { totalItems, maxItems },
    defaultMessage: `More than {totalItems} gaps match filters provided. Showing first {maxItems}. Constrain filters further to view additional gaps.`,
  });

export const GAPS_FILL_ALL_GAPS_ERROR_DISABLED_RULE_MESSAGE = i18n.translate(
  'xpack.securitySolution.gaps.dryRunBulkFillRuleGaps.failedModalDisabledRuleErrorLabel',
  {
    defaultMessage: 'Enable the rule to schedule gap fills.',
  }
);

export const GAPS_FILL_ALL_GAPS_UNKNOWN_ERROR_MESSAGE = (message: string) =>
  i18n.translate(
    'xpack.securitySolution.gaps.dryRunBulkFillRuleGaps.failedModalUnknownErrorLabel',
    {
      values: { message },
      defaultMessage: 'Cannot fill gaps for 1 rule ({message})',
    }
  );

export const GAPS_FILL_ALL_GAPS_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.gaps.fillAllGapsButtonLabel',
  {
    defaultMessage: 'Fill gaps',
  }
);

export const GAPS_FILL_ALL_GAPS_DRY_RUN_FAILED_MODAL_CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.gaps.dryRunBulkFillRuleGaps.failedModalCloseButtonLabel',
  {
    defaultMessage: 'Close',
  }
);

export const GAPS_FILL_ALL_GAPS_DRY_RUN_MODAL_HEADING = i18n.translate(
  'xpack.securitySolution.gaps.dryRunBulkFillRuleGaps.failedModalHeading',
  {
    defaultMessage: 'Unable to schedule gap fills for a disabled rule',
  }
);

export const GAPS_FILL_ALL_GAPS_WARNING_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.gaps.fillRuleGapsLongRunWarningToastTitle',
  {
    defaultMessage: 'Scheduling gap fills',
  }
);

export const GAPS_FILL_ALL_GAPS_WARNING_TOAST_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.gaps.fillRuleGapsLongRunWarningToastMessage',
  {
    defaultMessage: 'Scheduling gap fills for 1 rule.',
  }
);

export const GAPS_FILL_ALL_GAPS_WARNING_TOAST_NOTIFY = i18n.translate(
  'xpack.securitySolution.gaps.fillRuleGapsLongRunWarningToastNotifyLabel',
  {
    defaultMessage: `Notify me when done`,
  }
);
