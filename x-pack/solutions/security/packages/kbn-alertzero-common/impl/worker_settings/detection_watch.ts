/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Watch Worker settings, owned by the Detection Watch team. Adding a Rule Tuning setting
 * means: add the field to `RuleTuningWorkerExtras` in `detection_watch_settings.schema.yaml`, add
 * its default here (an older document receives that default for the new key), forward it in the
 * Rule Tuning workflow template, and build its control under the Watch page's
 * `custom_settings/rule_tuning/`. A rename or any other shape change also bumps `settingsVersion`
 * and adds a `migrations` step; see `README.md` in this folder.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  WATCH_AUTONOMY_REVIEW_GATED,
} from '../../constants';
import { RuleTuningWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

/** Default and bounds for Rule Tuning's analysis window, matching the sweep's analysis_window_days. */
export const ANALYSIS_WINDOW_DAYS_DEFAULT = 7;
export const ANALYSIS_WINDOW_DAYS_MIN = 1;
export const ANALYSIS_WINDOW_DAYS_MAX = 30;

/** Default and bounds for Rule Tuning's FP count threshold, matching the sweep's min_fp_count. */
export const FP_COUNT_THRESHOLD_DEFAULT = 10;
export const FP_COUNT_THRESHOLD_MIN = 2;
export const FP_COUNT_THRESHOLD_MAX = 100;

/** Default and bounds for Rule Tuning's FP rate threshold, matching the sweep's min_fp_rate_pct. */
export const FP_RATE_THRESHOLD_PCT_DEFAULT = 50;
export const FP_RATE_THRESHOLD_PCT_MIN = 0;
export const FP_RATE_THRESHOLD_PCT_MAX = 100;

export const RULE_TUNING_DEFAULT_EXTRAS: RuleTuningWorkerExtras = {
  analysisWindowDays: ANALYSIS_WINDOW_DAYS_DEFAULT,
  fpCountThreshold: FP_COUNT_THRESHOLD_DEFAULT,
  fpRateThresholdPct: FP_RATE_THRESHOLD_PCT_DEFAULT,
};

export const RULE_TUNING_SETTINGS: WorkerSettingsDeclaration<RuleTuningWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  settingsVersion: 1,
  allowedAutonomyLevels: WATCH_AUTONOMY_REVIEW_GATED,
  scheduleInterval: { defaultValue: '2h' },
  extras: { schema: RuleTuningWorkerExtras, defaultValue: RULE_TUNING_DEFAULT_EXTRAS },
};

export const RULE_CREATION_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  settingsVersion: 1,
  allowedAutonomyLevels: WATCH_AUTONOMY_REVIEW_GATED,
};
