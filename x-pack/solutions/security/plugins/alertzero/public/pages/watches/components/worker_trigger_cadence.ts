/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../settings_translations';

/** Schedule units the "Every N unit" trigger control offers. */
export type WorkerTriggerScheduleUnit = 'm' | 'h' | 'd';

const UNIT_LABELS: Record<WorkerTriggerScheduleUnit, string> = {
  m: i18n.SCHEDULE_UNIT_MINUTES,
  h: i18n.SCHEDULE_UNIT_HOURS,
  d: i18n.SCHEDULE_UNIT_DAYS,
};

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

/** Human label for the Worker header band's trigger badge, e.g. "Every 2 hours". */
export const workerScheduleCadenceLabel = (interval: string | undefined): string => {
  const { amount, unit } = parseWorkerScheduleInterval(interval);
  return `${i18n.TRIGGER_EVERY} ${amount} ${UNIT_LABELS[unit]}`;
};
