/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { validateDataView } from '@kbn/data-view-validation';
import { fromKueryExpression } from '@kbn/es-query';
import { EntityType, ALL_ENTITY_TYPES } from '../../../../common/domain/definitions/entity_schema';
import { HistorySnapshotBodyParams, LogExtractionBodyParams } from '../../constants';
import { parseDurationToMs } from '../../../infra/time';
import {
  LOG_EXTRACTION_DELAY_DEFAULT,
  LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT,
} from '../../../domain/definitions/saved_objects';

const MIN_FREQUENCY_MS = 30 * 1000;
const MIN_HISTORY_SNAPSHOT_FREQUENCY_MS = 60 * 60 * 1000; // 1h

export const BodySchema = z.object({
  entityTypes: z.array(EntityType).optional().default(ALL_ENTITY_TYPES),
  logExtraction: LogExtractionBodyParams.optional().superRefine(validateLogExtractionParams),
  historySnapshot: HistorySnapshotBodyParams.optional().superRefine(validateHistorySnapshotParams),
});

export function validateKql(kql: string): { isValid: boolean; errorMsg?: string } {
  try {
    if (!kql || kql.trim() === '') {
      return { isValid: true };
    }

    fromKueryExpression(kql);

    if (/(\s+)(and|or)\s*$/i.test(kql)) {
      throw new Error('Incomplete KQL expression');
    }

    if (!kql.includes(':')) {
      throw new Error('Field-based KQL is required');
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, errorMsg: error.message };
  }
}

function validateFilter(data: LogExtractionBodyParams, ctx: z.RefinementCtx): void {
  if (data.filter === undefined) {
    return;
  }
  const { isValid, errorMsg } = validateKql(data.filter);
  if (!isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['filter'],
      message: errorMsg,
    });
  }
}

function validateFrequencyParam(data: LogExtractionBodyParams, ctx: z.RefinementCtx): void {
  if (data.frequency === undefined) {
    return;
  }
  if (!isValidFrequency(data.frequency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'must be a valid duration of at least 30 seconds (e.g. 1m, 30s)',
    });
  }
}

function isValidFrequency(frequency: string): boolean {
  try {
    return parseDurationToMs(frequency) >= MIN_FREQUENCY_MS;
  } catch {
    return false;
  }
}

function validateAdditionalIndexPatterns(
  data: LogExtractionBodyParams,
  ctx: z.RefinementCtx
): void {
  const patterns = data.additionalIndexPatterns;
  if (patterns === undefined) {
    return;
  }
  patterns.forEach((value, i) => {
    const isEmpty = value.trim().length === 0;
    const errors = validateDataView(value);
    const illegalChars = errors.ILLEGAL_CHARACTERS ?? [];
    const hasSpaces = errors.CONTAINS_SPACES;
    const validIndexPattern = illegalChars.length === 0 && !hasSpaces;

    if (isEmpty || !validIndexPattern) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['additionalIndexPatterns', i],
        message: 'must be a non-empty, valid index pattern (no spaces or illegal characters)',
      });
    }
  });
}

function validateDelayVsLookbackPeriod(data: LogExtractionBodyParams, ctx: z.RefinementCtx): void {
  const hasDelay = data.delay !== undefined;
  const hasLookback = data.lookbackPeriod !== undefined;
  if (!hasDelay && !hasLookback) {
    return;
  }

  if (isDelayGteLookbackPeriod(data.delay, data.lookbackPeriod)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['delay'],
      message: 'must be less than lookbackPeriod',
    });
  }
}

function validateLogExtractionParams(
  data: LogExtractionBodyParams | undefined,
  ctx: z.RefinementCtx
): void {
  if (!data) return;

  validateFilter(data, ctx);
  validateFrequencyParam(data, ctx);
  validateAdditionalIndexPatterns(data, ctx);
  validateDelayVsLookbackPeriod(data, ctx);
}

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

function isDelayGteLookbackPeriod(delay?: string, lookbackPeriod?: string): boolean {
  const lookbackPeriodValue = lookbackPeriod ?? LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT;
  const delayValue = delay ?? LOG_EXTRACTION_DELAY_DEFAULT;
  try {
    const lookbackPeriodMs = parseDurationToMs(lookbackPeriodValue);
    const delayMs = parseDurationToMs(delayValue);
    return delayMs >= lookbackPeriodMs;
  } catch {
    return false;
  }
}
