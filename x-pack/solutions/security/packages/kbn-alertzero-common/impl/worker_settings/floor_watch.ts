/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS,
  ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS,
} from '@kbn/workflows/managed/definitions/alertzero/worker_settings_defaults';
import { scheduleIntervalToMinutes } from '@kbn/workflows/managed/definitions/alertzero/worker_template_values';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '../../constants';
import { AlertTriageWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

export const AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD_DEFAULT =
  ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.extras.defaultValue.autoCloseConfidenceScoreMinThreshold;

const ALERT_TRIAGE_EXTRAS_DEFAULTS = ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.extras.defaultValue;

export const BUDGET_PER_HOUR_DEFAULT = ALERT_TRIAGE_EXTRAS_DEFAULTS.budgetPerHour;
export const BUDGET_PER_HOUR_MIN = 10;
export const BUDGET_PER_HOUR_MAX = 5000;

/** Cost of one triage batch: a fixed overhead plus a cost per alert. The sweep planner uses these. */
export const TRIAGE_BATCH_OVERHEAD_COST = 5;
export const TRIAGE_ALERT_COST = 1;

/**
 * Least hourly budget for which one sweep can still fund a batch. Each sweep gets its share of the
 * hour, `floor(budget * interval / 60)`, and a sweep that cannot afford a batch plans nothing, so
 * a lower budget would never triage anything on this schedule.
 */
export const getMinBudgetPerHour = (scheduleInterval: string | undefined): number => {
  const intervalMinutes = scheduleIntervalToMinutes(
    scheduleInterval ?? ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.scheduleInterval.defaultValue
  );
  const cheapestBatchCost = TRIAGE_BATCH_OVERHEAD_COST + TRIAGE_ALERT_COST;
  return Math.max(BUDGET_PER_HOUR_MIN, Math.ceil((60 * cheapestBatchCost) / intervalMinutes));
};

export const LOOKBACK_HOURS_DEFAULT = ALERT_TRIAGE_EXTRAS_DEFAULTS.lookbackHours;
export const LOOKBACK_HOURS_MIN = 1;
export const LOOKBACK_HOURS_MAX = 168;

export const ALERT_TRIAGE_DEFAULT_EXTRAS: AlertTriageWorkerExtras = {
  ...ALERT_TRIAGE_EXTRAS_DEFAULTS,
};

export const ALERT_TRIAGE_SETTINGS: WorkerSettingsDeclaration<AlertTriageWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  allowedAutonomyLevels: ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels,
  scheduleInterval: ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.scheduleInterval,
  extras: { schema: AlertTriageWorkerExtras, defaultValue: ALERT_TRIAGE_DEFAULT_EXTRAS },
  crossFieldIssues: ({ scheduleInterval, extras }) => {
    const parsed = AlertTriageWorkerExtras.safeParse(extras);
    if (!parsed.success) return [];
    const minBudgetPerHour = getMinBudgetPerHour(scheduleInterval);
    return parsed.data.budgetPerHour < minBudgetPerHour
      ? [
          {
            path: ['extras', 'budgetPerHour'],
            message: `must be at least ${minBudgetPerHour} for a ${scheduleInterval} schedule, or a run cannot fund even one batch of triage work`,
          },
        ]
      : [];
  },
};

export const ATTACK_DISCOVERY_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  allowedAutonomyLevels: ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels,
  scheduleInterval: ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS.scheduleInterval,
};
