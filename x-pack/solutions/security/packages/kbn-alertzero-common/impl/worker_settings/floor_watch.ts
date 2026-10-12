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
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '../../constants';
import { AlertTriageWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

export const AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD_DEFAULT =
  ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.extras.defaultValue.autoCloseConfidenceScoreMinThreshold;

export const ALERT_TRIAGE_DEFAULT_EXTRAS: AlertTriageWorkerExtras = {
  ...ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.extras.defaultValue,
};

export const ALERT_TRIAGE_SETTINGS: WorkerSettingsDeclaration<AlertTriageWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  allowedAutonomyLevels: ALERT_TRIAGE_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels,
  extras: { schema: AlertTriageWorkerExtras, defaultValue: ALERT_TRIAGE_DEFAULT_EXTRAS },
};

export const ATTACK_DISCOVERY_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  allowedAutonomyLevels: ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels,
  scheduleInterval: ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS.scheduleInterval,
};
