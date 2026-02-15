/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OBJECTIVE_LABELS = {
  timeWindow: i18n.translate('xpack.slo.sloEdit.timeWindowType.label', {
    defaultMessage: 'Time window',
  }),
  timeWindowTooltip: i18n.translate('xpack.slo.sloEdit.timeWindowType.tooltip', {
    defaultMessage: 'Choose between a rolling or a calendar aligned window.',
  }),
  duration: i18n.translate('xpack.slo.sloEdit.timeWindowDuration.label', {
    defaultMessage: 'Duration',
  }),
  durationTooltip: i18n.translate('xpack.slo.sloEdit.timeWindowDuration.tooltip', {
    defaultMessage: 'The time window duration used to compute the SLO over.',
  }),
  budgetingMethod: i18n.translate('xpack.slo.sloEdit.budgetingMethod.label', {
    defaultMessage: 'Budgeting method',
  }),
  budgetingMethodTooltip: i18n.translate('xpack.slo.sloEdit.budgetingMethod.tooltip', {
    defaultMessage:
      'Occurrences-based SLO uses the ratio of good events over the total events during the time window. Timeslices-based SLO uses the ratio of good time slices over the total time slices during the time window.',
  }),
  targetSlo: i18n.translate('xpack.slo.sloEdit.targetSlo.label', {
    defaultMessage: 'Target / SLO (%)',
  }),
  targetSloTooltip: i18n.translate('xpack.slo.sloEdit.targetSlo.tooltip', {
    defaultMessage: 'The target objective in percentage for the SLO.',
  }),
  serverlessWarning: i18n.translate('xpack.slo.sloEdit.timeWindow.serverlessWarning', {
    defaultMessage: 'Initial data backfill is limited to the past 7 days',
  }),
};
