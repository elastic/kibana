/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Watch Worker settings, owned by the Detection Watch team. Adding a Rule Tuning setting
 * means: add the field to `RuleTuningWorkerExtras` in `detection_watch_settings.schema.yaml`, add
 * its default here, forward it in the Rule Tuning workflow template, and build its control under
 * the Watch page's `custom_settings/rule_tuning/`. Nothing outside Detection-owned code changes.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import { RuleTuningWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

/** Default and bounds for Rule Tuning's analysis window, matching the sweep input. */
export const ANALYSIS_WINDOW_DAYS_DEFAULT = 14;
export const ANALYSIS_WINDOW_DAYS_MIN = 1;
export const ANALYSIS_WINDOW_DAYS_MAX = 30;

export const RULE_TUNING_DEFAULT_EXTRAS: RuleTuningWorkerExtras = {
  analysisWindowDays: ANALYSIS_WINDOW_DAYS_DEFAULT,
};

export const RULE_TUNING_SETTINGS: WorkerSettingsDeclaration<RuleTuningWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
  scheduleInterval: { defaultValue: '2h' },
  extras: { schema: RuleTuningWorkerExtras, defaultValue: RULE_TUNING_DEFAULT_EXTRAS },
};

export const RULE_CREATION_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
};
