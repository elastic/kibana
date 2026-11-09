/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/** Hunt Library run history lives in workflow executions, so they must outlive this window. */
export const MIN_EXECUTION_RETENTION_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export type RetentionPreflight =
  | { ok: true; retentionDays: number | null }
  | { ok: false; retentionDays: number; reason: 'retention_below_minimum' };

export interface HuntLibraryPreflight {
  retention: RetentionPreflight;
}

/** `retentionMs: null` means nothing expires executions, which always satisfies the minimum. */
export const checkExecutionRetention = (retention: {
  retentionMs: number | null;
}): RetentionPreflight => {
  if (retention.retentionMs === null) {
    return { ok: true, retentionDays: null };
  }
  const retentionDays = retention.retentionMs / MS_PER_DAY;
  return retentionDays >= MIN_EXECUTION_RETENTION_DAYS
    ? { ok: true, retentionDays }
    : { ok: false, retentionDays, reason: 'retention_below_minimum' };
};

export const runHuntLibraryPreflight = async ({
  getExecutionRetention,
  logger,
}: {
  getExecutionRetention: () => Promise<{ retentionMs: number | null }>;
  logger: Logger;
}): Promise<HuntLibraryPreflight> => {
  const retention = checkExecutionRetention(await getExecutionRetention());

  if (!retention.ok) {
    logger.error(
      `Hunt Library requires at least ${MIN_EXECUTION_RETENTION_DAYS} days of workflow execution retention, found ${retention.retentionDays}. Library Hunt worker enablement is refused until retention is raised.`
    );
  }
  return { retention };
};
