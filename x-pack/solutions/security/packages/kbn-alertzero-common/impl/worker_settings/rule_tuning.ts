/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rule Tuning Worker settings. Adding a setting means: add the field to `RuleTuningWorkerExtras`
 * in `rule_tuning_settings.schema.yaml`, add its default to `RULE_TUNING_WORKER_SETTINGS_DEFAULTS`
 * in `kbn-workflows/managed/definitions/alertzero/worker_settings_defaults.ts`, forward it in the
 * Rule Tuning workflow template, and build its control under the Watch page's
 * `custom_settings/rule_tuning/`.
 */

import { RULE_TUNING_WORKER_SETTINGS_DEFAULTS } from '@kbn/workflows/managed/definitions/alertzero/worker_settings_defaults';
import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID } from '../../constants';
import { RuleTuningWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

const RULE_TUNING_EXTRAS_DEFAULTS = RULE_TUNING_WORKER_SETTINGS_DEFAULTS.extras.defaultValue;

/** Default and bounds for Rule Tuning's analysis window, matching the sweep's analysis_window_days. */
export const ANALYSIS_WINDOW_DAYS_DEFAULT = RULE_TUNING_EXTRAS_DEFAULTS.analysisWindowDays;
export const ANALYSIS_WINDOW_DAYS_MIN = 1;
export const ANALYSIS_WINDOW_DAYS_MAX = 30;

/** Default and bounds for Rule Tuning's FP count threshold, matching the sweep's min_fp_count. */
export const FP_COUNT_THRESHOLD_DEFAULT = RULE_TUNING_EXTRAS_DEFAULTS.fpCountThreshold;
export const FP_COUNT_THRESHOLD_MIN = 2;
export const FP_COUNT_THRESHOLD_MAX = 100;

/** Default and bounds for Rule Tuning's FP rate threshold, matching the sweep's min_fp_rate_pct. */
export const FP_RATE_THRESHOLD_PCT_DEFAULT = RULE_TUNING_EXTRAS_DEFAULTS.fpRateThresholdPct;
export const FP_RATE_THRESHOLD_PCT_MIN = 0;
export const FP_RATE_THRESHOLD_PCT_MAX = 100;

export const RULE_TUNING_DEFAULT_EXTRAS: RuleTuningWorkerExtras = {
  ...RULE_TUNING_EXTRAS_DEFAULTS,
};

export const RULE_TUNING_SETTINGS: WorkerSettingsDeclaration<RuleTuningWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  allowedAutonomyLevels: RULE_TUNING_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels,
  scheduleInterval: RULE_TUNING_WORKER_SETTINGS_DEFAULTS.scheduleInterval,
  extras: { schema: RuleTuningWorkerExtras, defaultValue: RULE_TUNING_DEFAULT_EXTRAS },
};
