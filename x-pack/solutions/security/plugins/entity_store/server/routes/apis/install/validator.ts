/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EntityType, ALL_ENTITY_TYPES } from '../../../../common/domain/definitions/entity_schema';
import { HistorySnapshotBodyParams } from '../../constants';
import { parseDurationToMs } from '../../../infra/time';
import { LogExtractionInstallSchema } from '../utils/log_extraction_validator';

const MIN_HISTORY_SNAPSHOT_FREQUENCY_MS = 60 * 60 * 1000; // 1h

export const BodySchema = z.object({
  entityTypes: z.array(EntityType).optional().default(ALL_ENTITY_TYPES),
  logExtraction: LogExtractionInstallSchema,
  historySnapshot: HistorySnapshotBodyParams.optional().superRefine(validateHistorySnapshotParams),
});

function validateHistorySnapshotParams(
  data: z.infer<typeof HistorySnapshotBodyParams> | undefined,
  ctx: z.RefinementCtx
): void {
  if (!data?.frequency) return;
  if (!isValidHistorySnapshotFrequency(data.frequency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'must be a valid duration of at least 1 hour (e.g. 1h, 24h)',
    });
  }
}

function isValidHistorySnapshotFrequency(frequency: string): boolean {
  try {
    return parseDurationToMs(frequency) >= MIN_HISTORY_SNAPSHOT_FREQUENCY_MS;
  } catch {
    return false;
  }
}
