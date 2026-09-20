/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import { AttackDiscoveryWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

export const ALERT_TRIAGE_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
};

export const ATTACK_DISCOVERY_SETTINGS: WorkerSettingsDeclaration<AttackDiscoveryWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  // Attack Discovery has no assisted gate: a run either waits for an analyst (manual) or
  // generates on its own schedule with review after the fact (supervised).
  allowedAutonomyLevels: ['manual', 'supervised'],
  // Matches the Attack Discovery schedule form default.
  scheduleInterval: { defaultValue: '24h' },
  // No `defaultValue`: the agent is opt-in, so a Worker that has never had one picked stores no
  // `extras` key and the review keeps opening its conversation with the default agent.
  extras: { schema: AttackDiscoveryWorkerExtras },
};
