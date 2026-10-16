/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionStrategyId } from './strategies';

/** Pipeline steps that write to the activity log. */
export const ACTIVITY_STEPS = [
  'strategy',
  'rules',
  'baseline',
  'identity',
  'join',
  'agent',
  'state',
  'cap',
  'trial',
  'verifier',
  'publish',
  'learning',
  'operator',
  'run',
] as const;
export type ActivityStep = (typeof ACTIVITY_STEPS)[number];

/** One entry in the engine activity log: what the engine did and why. */
export interface ActivityEntry {
  '@timestamp': string;
  run_id?: string;
  step: ActivityStep;
  action: string;
  message: string;
  strategy?: DetectionStrategyId;
  service?: string;
  detection_id?: string;
  event_id?: string;
  details?: Record<string, unknown>;
}
