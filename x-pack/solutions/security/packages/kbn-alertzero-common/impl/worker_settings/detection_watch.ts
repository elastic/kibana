/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Watch Worker settings, owned by the Detection Watch team. Adding a Rule Tuning setting
 * means: add the field to `RuleTuningWorkerExtras` in `detection_watch_settings.schema.yaml`, add
 * its default in the workflows constants this file imports, forward it in the Rule Tuning workflow
 * template, and build its control under the Watch page's `custom_settings/rule_tuning/`. Nothing
 * outside Detection-owned code changes.
 */

import {
  RULE_TUNING_ANALYSIS_WINDOW_DAYS_DEFAULT,
  RULE_TUNING_EXTRAS_DEFAULTS,
  RULE_TUNING_FP_COUNT_THRESHOLD_DEFAULT,
  RULE_TUNING_FP_RATE_THRESHOLD_PCT_DEFAULT,
  RULE_TUNING_SCHEDULE_INTERVAL_DEFAULT,
} from '@kbn/workflows';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  WATCH_AUTONOMY_REVIEW_GATED,
} from '../../constants';
import { RuleTuningWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

/**
 * Re-exported under the names the Watch page already imports. The values live in
 * `@kbn/workflows`, which is what the YAML template fills from.
 */
export const ANALYSIS_WINDOW_DAYS_DEFAULT = RULE_TUNING_ANALYSIS_WINDOW_DAYS_DEFAULT;
export const ANALYSIS_WINDOW_DAYS_MIN = 1;
export const ANALYSIS_WINDOW_DAYS_MAX = 30;

/** Bounds for Rule Tuning's FP count threshold, matching the sweep's min_fp_count. */
export const FP_COUNT_THRESHOLD_DEFAULT = RULE_TUNING_FP_COUNT_THRESHOLD_DEFAULT;
export const FP_COUNT_THRESHOLD_MIN = 2;
export const FP_COUNT_THRESHOLD_MAX = 100;

/** Bounds for Rule Tuning's FP rate threshold, matching the sweep's min_fp_rate_pct. */
export const FP_RATE_THRESHOLD_PCT_DEFAULT = RULE_TUNING_FP_RATE_THRESHOLD_PCT_DEFAULT;
export const FP_RATE_THRESHOLD_PCT_MIN = 0;
export const FP_RATE_THRESHOLD_PCT_MAX = 100;

export const RULE_TUNING_DEFAULT_EXTRAS: RuleTuningWorkerExtras = RULE_TUNING_EXTRAS_DEFAULTS;

export const RULE_TUNING_SETTINGS: WorkerSettingsDeclaration<RuleTuningWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_REVIEW_GATED,
  scheduleInterval: { defaultValue: RULE_TUNING_SCHEDULE_INTERVAL_DEFAULT },
  extras: { schema: RuleTuningWorkerExtras, defaultValue: RULE_TUNING_DEFAULT_EXTRAS },
};

export const RULE_CREATION_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_REVIEW_GATED,
};
