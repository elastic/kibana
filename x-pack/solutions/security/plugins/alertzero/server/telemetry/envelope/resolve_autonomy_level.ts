/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_AUTONOMY_LEVELS } from '@kbn/alertzero-common';
import type { AlertZeroAutonomyLevel } from '../constants';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const isAutonomyLevel = (value: unknown): value is AlertZeroAutonomyLevel =>
  typeof value === 'string' && (WATCH_AUTONOMY_LEVELS as readonly string[]).includes(value);

/**
 * Reads the autonomy level a Worker run was rendered with from its persisted definition consts
 * (`consts.worker_settings.autonomy`). A parked review can outlive a settings change, so the
 * installed Worker's current settings would misattribute the run.
 */
export const resolveAutonomyLevel = (
  consts: Record<string, unknown> | undefined
): AlertZeroAutonomyLevel | undefined => {
  const workerSettings = consts?.worker_settings;
  if (!isRecord(workerSettings)) {
    return undefined;
  }
  const { autonomy } = workerSettings;
  return isAutonomyLevel(autonomy) ? autonomy : undefined;
};
