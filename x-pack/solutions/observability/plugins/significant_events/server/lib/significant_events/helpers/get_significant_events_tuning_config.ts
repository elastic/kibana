/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/management-settings-ids';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  resolveSignificantEventsTuningConfig,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';

/**
 * Reads the tuning config from global uiSettings, merging with defaults
 * for any missing keys. If the stored config is invalid, logs a warning
 * and returns full defaults.
 */
export async function getSignificantEventsTuningConfig(
  globalUiSettingsClient: IUiSettingsClient,
  logger: Logger
): Promise<SignificantEventsTuningConfig> {
  let stored: unknown;
  try {
    const raw = await globalUiSettingsClient.get<string>(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG
    );
    stored = JSON.parse(raw);
  } catch (err) {
    logger.warn(
      `Failed to read Significant Events tuning config, falling back to defaults: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG };
  }

  return resolveSignificantEventsTuningConfig(stored, logger);
}
