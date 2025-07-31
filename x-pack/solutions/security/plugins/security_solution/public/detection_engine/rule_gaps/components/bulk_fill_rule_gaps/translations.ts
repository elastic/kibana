/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const BULK_FILL_RULE_GAPS_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.modalTitle',
  {
    defaultMessage: 'Schedule gap fills',
  }
);

export const BULK_FILL_RULE_GAPS_TIME_RANGE_TITLE = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.timeRangeTitle',
  {
    defaultMessage: 'Select a time range for gap fills',
  }
);

export const BULK_FILL_RULE_GAPS_START_AT_TITLE = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.startAtTitle',
  {
    defaultMessage: 'Start at',
  }
);

export const BULK_FILL_RULE_GAPS_END_AT_TITLE = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.endAtTitle',
  {
    defaultMessage: 'Finish at',
  }
);

export const BULK_FILL_RULE_GAPS_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.confirmButton',
  {
    defaultMessage: 'Schedule gap fills',
  }
);

export const BULK_FILL_RULE_GAPS_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const BULK_FILL_RULE_GAPS_INVALID_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.invalidTimeRangeError',
  {
    defaultMessage: 'Selected time range is invalid',
  }
);

export const BULK_FILL_RULE_GAPS_FUTURE_TIME_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.futureTimeRangeError',
  {
    defaultMessage: 'Select a different time range. Future gap fills are not supported.',
  }
);

export const BULK_FILL_RULE_GAPS_START_DATE_OUT_OF_RANGE_ERROR = (maxDaysLookback: number) =>
  i18n.translate('xpack.securitySolution.bulkFillRuleGapsModal.startDateIsOutOfRangeError', {
    values: { maxDaysLookback },
    defaultMessage:
      'Rule gap fills cannot be scheduled earlier than {maxDaysLookback, plural, =1 {# day} other {# days}} ago',
  });

export const BULK_FILL_RULE_GAPS_NOTIFICATIONS_LIMITATIONS = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.notificationsLimitations',
  {
    defaultMessage:
      'Alert summary rule actions that run at a custom frequency are not performed during manual runs started by gap fills.',
  }
);

export const BULK_FILL_RULE_GAPS_MAX_GAPS_LIMITATIONS = i18n.translate(
  'xpack.securitySolution.bulkFillRuleGapsModal.maxGapsLimitations',
  {
    defaultMessage: 'A maximum of 1000 gaps will be filled per rule.',
  }
);
