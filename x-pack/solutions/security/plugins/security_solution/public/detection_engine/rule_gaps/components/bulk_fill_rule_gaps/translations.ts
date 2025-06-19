/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const BULK_FILL_RULE_GAPS_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.modalTitle',
  {
    defaultMessage: 'Schedule gaps fill',
  }
);

export const BULK_FILL_RULE_GAPS_TIME_RANGE_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.timeRangeTitle',
  {
    defaultMessage: 'Select timerange for gaps fill',
  }
);

export const BULK_FILL_RULE_GAPS_START_AT_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.startAtTitle',
  {
    defaultMessage: 'Start at',
  }
);

export const BULK_FILL_RULE_GAPS_END_AT_TITLE = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.endAtTitle',
  {
    defaultMessage: 'Finish at',
  }
);

export const BULK_FILL_RULE_GAPS_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.confirmButton',
  {
    defaultMessage: 'Run',
  }
);

export const BULK_FILL_RULE_GAPS_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const BULK_FILL_RULE_GAPS_INVALID_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.invalidTimeRangeError',
  {
    defaultMessage: 'Selected time range is invalid',
  }
);

export const BULK_FILL_RULE_GAPS_FUTURE_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.futureTimeRangeError',
  {
    defaultMessage: 'Manual rule gaps fill cannot be scheduled for the future',
  }
);

export const BULK_FILL_RULE_GAPS_START_DATE_OUT_OF_RANGE_ERROR = (maxDaysLookback: number) =>
  i18n.translate('xpack.securitySolution.manuelRulaRun.startDateIsOutOfRangeError', {
    values: { maxDaysLookback },
    defaultMessage:
      'Manual rule gaps fill cannot be scheduled earlier than {maxDaysLookback, plural, =1 {# day} other {# days}} ago',
  });

export const BULK_FILL_RULE_GAPS_NOTIFIACTIONS_LIMITATIONS = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.notificationsLimitations',
  {
    defaultMessage:
      'Alert summary rule actions that run at a custom frequency are not performed during manual rule runs triggered by the gaps fill process.',
  }
);

export const BULK_FILL_RULE_GAPS_MAX_GAPS_LIMITATIONS = i18n.translate(
  'xpack.securitySolution.manualRuleGapsFilling.maxGapsLimitations',
  {
    defaultMessage: 'A maximum of 1000 gaps will be filled per rule.',
  }
);
