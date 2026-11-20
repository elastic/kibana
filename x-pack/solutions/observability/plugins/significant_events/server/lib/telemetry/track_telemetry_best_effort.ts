/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/** Runs a telemetry call so that a failure is logged and never reaches the caller. */
export const trackTelemetryBestEffort = ({
  track,
  logger,
  description,
}: {
  track: () => void;
  logger: Logger;
  description: string;
}): void => {
  try {
    track();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown telemetry error';
    logger.warn(`Failed to track ${description}: ${message}`);
  }
};
