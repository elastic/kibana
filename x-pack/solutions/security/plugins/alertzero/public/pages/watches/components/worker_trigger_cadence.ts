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
 * Human label for the Worker header band's trigger badge, e.g. "Every 2 hours" / "Every 1 hour".
 * Each unit gets its own ICU-pluralized message (rather than a static plural-only unit string
 * spliced into a shared template) so a translator can reorder the whole phrase per locale and a
 * one-unit interval reads correctly in English.
 */
export const workerScheduleCadenceLabel = (interval: string | undefined): string => {
  const { amount, unit } = parseWorkerScheduleInterval(interval);
  switch (unit) {
    case 'm':
      return i18n.translate('xpack.alertzero.watches.settings.trigger.cadence.minutes', {
        defaultMessage: 'Every {amount} {amount, plural, one {minute} other {minutes}}',
        values: { amount },
      });
    case 'h':
      return i18n.translate('xpack.alertzero.watches.settings.trigger.cadence.hours', {
        defaultMessage: 'Every {amount} {amount, plural, one {hour} other {hours}}',
        values: { amount },
      });
    case 'd':
      return i18n.translate('xpack.alertzero.watches.settings.trigger.cadence.days', {
        defaultMessage: 'Every {amount} {amount, plural, one {day} other {days}}',
        values: { amount },
      });
  }
};
