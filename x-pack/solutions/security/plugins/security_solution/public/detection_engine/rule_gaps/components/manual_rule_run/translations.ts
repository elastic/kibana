/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const MANUAL_RULE_RUN_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleRun.modalTitle',
  {
    defaultMessage: 'Manual rule run',
  }
);

export const MANUAL_RULE_RUN_TIME_RANGE_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleRun.timeRangeTitle',
  {
    defaultMessage: 'Select timerange for manual rule run',
  }
);

export const MANUAL_RULE_RUN_START_AT_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleRun.startAtTitle',
  {
    defaultMessage: 'Start at',
  }
);

export const MANUAL_RULE_RUN_END_AT_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleRun.endAtTitle',
  {
    defaultMessage: 'Finish at',
  }
);

export const MANUAL_RULE_RUN_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.manualRuleRun.confirmButton',
  {
    defaultMessage: 'Run',
  }
);

export const MANUAL_RULE_RUN_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.manualRuleRun.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const MANUAL_RULE_RUN_INVALID_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.manualRuleRun.invalidTimeRangeError',
  {
    defaultMessage: 'Selected time range is invalid',
  }
);

export const MANUAL_RULE_RUN_FUTURE_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.manualRuleRun.futureTimeRangeError',
  {
    defaultMessage: 'Manual rule run cannot be scheduled for the future',
  }
);

export const MANUAL_RULE_RUN_START_DATE_OUT_OF_RANGE_ERROR = (maxDaysLookback: number) =>
  i18n.translate('xpack.securitySolution.manuelRulaRun.startDateIsOutOfRangeError', {
    values: { maxDaysLookback },
    defaultMessage:
      'Manual rule run cannot be scheduled earlier than {maxDaysLookback, plural, =1 {# day} other {# days}} ago',
  });

export const MANUAL_RULE_RUN_NOTIFIACTIONS_LIMITATIONS = i18n.translate(
  'xpack.securitySolution.manualRuleRun.notificationsLimitations',
  {
    defaultMessage:
      'Alert summary rule actions that run at a custom frequency are not performed during manual rule runs.',
  }
);
