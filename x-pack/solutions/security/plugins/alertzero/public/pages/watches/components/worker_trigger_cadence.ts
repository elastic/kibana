/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Schedule units the "Every N unit" trigger control offers. */
export type WorkerTriggerScheduleUnit = 'm' | 'h' | 'd';

/** Parses a Worker's `scheduleInterval` (e.g. `"2h"`) into amount + unit, defaulting to 1h. */
export const parseWorkerScheduleInterval = (
  interval: string | undefined
): { amount: number; unit: WorkerTriggerScheduleUnit } => {
  const match = /^(\d+)([mhd])$/.exec(interval ?? '');
  if (!match) {
    return { amount: 1, unit: 'h' };
  }
  return { amount: Number(match[1]), unit: match[2] as WorkerTriggerScheduleUnit };
};

/**
 * Human label for the header band's trigger badge, e.g. "Every 2 hours". Each unit gets its own
 * ICU-pluralized message so a translator can reorder the whole phrase per locale.
 */
export const workerScheduleCadenceLabel = (interval: string | undefined): string => {
  const { amount, unit } = parseWorkerScheduleInterval(interval);
  switch (unit) {
    case 'm':
      return i18n.translate('xpack.alertzero.watches.settings.trigger.cadence.minutes', {
        defaultMessage: '{amount, plural, =1 {Every minute} other {Every # minutes}}',
        values: { amount },
      });
    case 'h':
      return i18n.translate('xpack.alertzero.watches.settings.trigger.cadence.hours', {
        defaultMessage: '{amount, plural, =1 {Every hour} other {Every # hours}}',
        values: { amount },
      });
    case 'd':
      return i18n.translate('xpack.alertzero.watches.settings.trigger.cadence.days', {
        defaultMessage: '{amount, plural, =1 {Every day} other {Every # days}}',
        values: { amount },
      });
  }
};
