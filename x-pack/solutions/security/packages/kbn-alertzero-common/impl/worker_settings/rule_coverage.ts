/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS } from '@kbn/workflows/managed/definitions/alertzero/worker_settings_defaults';
import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID } from '../../constants';
import { RuleCoverageWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

const RULE_COVERAGE_EXTRAS_DEFAULTS = RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS.extras.defaultValue;

export const LOOKBACK_DAYS_DEFAULT = RULE_COVERAGE_EXTRAS_DEFAULTS.lookbackDays;
export const LOOKBACK_DAYS_MIN = 8;
export const LOOKBACK_DAYS_MAX = 90;

export const MAX_GAPS_PER_RUN_DEFAULT = RULE_COVERAGE_EXTRAS_DEFAULTS.maxGapsPerRun;
export const MAX_GAPS_PER_RUN_MIN = 1;
export const MAX_GAPS_PER_RUN_MAX = 50;

export const RULE_COVERAGE_DEFAULT_EXTRAS: RuleCoverageWorkerExtras = {
  ...RULE_COVERAGE_EXTRAS_DEFAULTS,
};

export const RULE_COVERAGE_SETTINGS: WorkerSettingsDeclaration<RuleCoverageWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  allowedAutonomyLevels: RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels,
  scheduleInterval: RULE_COVERAGE_WORKER_SETTINGS_DEFAULTS.scheduleInterval,
  extras: { schema: RuleCoverageWorkerExtras, defaultValue: RULE_COVERAGE_DEFAULT_EXTRAS },
};
