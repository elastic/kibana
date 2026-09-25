/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_SCHEDULE_INTERVAL_DEFAULT } from '@kbn/workflows';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import type { WorkerSettingsDeclaration } from './types';

export const ALERT_TRIAGE_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
};

export const ATTACK_DISCOVERY_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  // Two levels rather than the shared three: this Worker has exactly one gate — the
  // forensics handoff a true-positive or inconclusive verdict proposes — so it needs
  // one level that gates it and one that does not. `assisted` sits between those and
  // would mean the same thing as `manual` here. Scoped down from three by product on
  // 2026-09-14; the shared scale itself is unchanged.
  allowedAutonomyLevels: ['manual', 'supervised'],
  // Matches the Attack Discovery schedule form default.
  scheduleInterval: { defaultValue: ATTACK_DISCOVERY_SCHEDULE_INTERVAL_DEFAULT },
};
