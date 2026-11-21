/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS } from '@kbn/workflows/managed/definitions/alertzero/worker_settings_defaults';
import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '../../constants';
import type { WorkerSettingsDeclaration } from './types';

export const ATTACK_DISCOVERY_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  allowedAutonomyLevels: ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels,
  scheduleInterval: ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS.scheduleInterval,
};
