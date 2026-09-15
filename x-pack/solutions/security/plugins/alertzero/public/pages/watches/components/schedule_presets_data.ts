/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  type WorkerScheduleUnit,
} from '@kbn/alertzero-common';

export interface SchedulePreset {
  /** Short button label, e.g. "15m", "1h", "Daily". */
  label: string;
  amount: number;
  unit: WorkerScheduleUnit;
}

/**
 * Preset sets are implicit cadence recommendations bracketing each Worker's
 * shipped default — ported from the Sep 11 prototype. Detection sets are
 * design-chosen neighbours of the defaults, not product-blessed guidance.
 */
const ATTACK_DISCOVERY_PRESETS: readonly SchedulePreset[] = [
  { label: '15m', amount: 15, unit: 'm' },
  { label: '1h', amount: 1, unit: 'h' },
  { label: '4h', amount: 4, unit: 'h' },
  { label: '24h', amount: 24, unit: 'h' },
];

const HUNT_PRESETS: readonly SchedulePreset[] = [
  { label: '1h', amount: 1, unit: 'h' },
  { label: '4h', amount: 4, unit: 'h' },
  { label: '12h', amount: 12, unit: 'h' },
  { label: '24h', amount: 24, unit: 'h' },
];

const RULE_TUNING_PRESETS: readonly SchedulePreset[] = [
  { label: '1h', amount: 1, unit: 'h' },
  { label: '2h', amount: 2, unit: 'h' },
  { label: '6h', amount: 6, unit: 'h' },
  { label: '24h', amount: 24, unit: 'h' },
];

const RULE_CREATION_PRESETS: readonly SchedulePreset[] = [
  { label: '2h', amount: 2, unit: 'h' },
  { label: '6h', amount: 6, unit: 'h' },
  { label: '12h', amount: 12, unit: 'h' },
  { label: '24h', amount: 24, unit: 'h' },
];

const PRESETS_BY_WORKER: Record<string, readonly SchedulePreset[]> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: ATTACK_DISCOVERY_PRESETS,
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: HUNT_PRESETS,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: RULE_TUNING_PRESETS,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: RULE_CREATION_PRESETS,
};

/** Runs-per-day the day strip collapses to a solid band above (96 = every 15m). */
export const DAY_STRIP_DENSE_RUNS_PER_DAY = 96;

export const schedulePresetsForWorker = (workerId: string): readonly SchedulePreset[] | undefined =>
  PRESETS_BY_WORKER[workerId];

export const scheduleIntervalToMinutes = (amount: number, unit: WorkerScheduleUnit): number => {
  if (unit === 'm') return Math.max(amount, 1);
  return Math.max(amount * 60, 1);
};

export const runsPerDayFromMinutes = (intervalMinutes: number): number =>
  1440 / Math.max(intervalMinutes, 1);

/**
 * Trigger-row helper copy — not a visualization caption. Appends the
 * load-and-cost caution when the interval is below the Worker's caution floor.
 */
export const formatScheduleRunsHelper = ({
  runsPerDay,
  cautionBelowMinutes,
  intervalMinutes,
}: {
  runsPerDay: number;
  /** Attack Discovery caution when interval < 15m. */
  cautionBelowMinutes?: number;
  intervalMinutes: number;
}): string => {
  const caution =
    cautionBelowMinutes !== undefined && intervalMinutes < cautionBelowMinutes
      ? ` ${i18n.translate('xpack.alertzero.watches.settings.scheduleInterval.frequentCaution', {
          defaultMessage: 'Very frequent runs increase load and cost.',
        })}`
      : '';
  return (
    i18n.translate('xpack.alertzero.watches.settings.scheduleInterval.runsPerDay', {
      defaultMessage: '{runsCount, plural, one {# run per day.} other {# runs per day.}}',
      values: { runsCount: runsPerDay < 1 ? 1 : Math.round(runsPerDay * 10) / 10 },
    }) + caution
  );
};

/** Below this interval (minutes), Attack Discovery shows the frequent-run caution. */
export const ATTACK_DISCOVERY_CAUTION_BELOW_MINUTES = 15;
