/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
} from '@kbn/alertzero-common';
import { AlertTriageSettings } from './alert_triage_settings';
import { RuleTuningSettings } from './rule_tuning/rule_tuning_settings';
import type { WorkerCustomSettingsComponent } from './types';

/**
 * Watch-owned settings components by Worker id. A Worker without an entry renders only the shared
 * controls. Whether a Worker's declared `extras` has a matching control here is the Watch team's
 * responsibility, guarded by its component tests and review.
 */
const WORKER_CUSTOM_SETTINGS_COMPONENTS: Partial<Record<string, WorkerCustomSettingsComponent>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: AlertTriageSettings,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: RuleTuningSettings,
};

export const getWorkerCustomSettingsComponent = (
  workerId: string
): WorkerCustomSettingsComponent | undefined => WORKER_CUSTOM_SETTINGS_COMPONENTS[workerId];
