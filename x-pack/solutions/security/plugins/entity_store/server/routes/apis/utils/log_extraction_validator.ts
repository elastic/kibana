/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  validateFilter,
  validateFrequency,
  validateIndexPattern,
  validateDuration,
  parseDurationToMs,
} from '../../../../common/log_extraction_params';
import type { LogExtractionBodyParams } from '../../constants';
import { LogExtractionInstallParams, LogExtractionUpdateParams } from '../../constants';
import {
  LOG_EXTRACTION_DELAY_DEFAULT,
  LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT,
} from '../../../domain/saved_objects';

export { validateFilter as validateKql };

function validateFilterParam(data: LogExtractionBodyParams, ctx: z.RefinementCtx): void {
  if (data.filter === undefined) return;
  const error = validateFilter(data.filter);
  if (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['filter'],
      message: error,
    });
  }
}

function validateFrequencyParam(data: LogExtractionBodyParams, ctx: z.RefinementCtx): void {
  if (data.frequency === undefined) return;
  const error = validateFrequency(data.frequency);
  if (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: error,
    });
  }
}

function validateAdditionalIndexPatterns(
  data: LogExtractionBodyParams,
  ctx: z.RefinementCtx
): void {
  const patterns = data.additionalIndexPatterns;
  if (patterns === undefined) return;
  patterns.forEach((value, i) => {
    const error = validateIndexPattern(value);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['additionalIndexPatterns', i],
        message: error,
      });
    }
  });
}

function validateDelayVsLookbackPeriod(data: LogExtractionBodyParams, ctx: z.RefinementCtx): void {
  const hasDelay = data.delay !== undefined;
  const hasLookback = data.lookbackPeriod !== undefined;
  if (!hasDelay && !hasLookback) return;

  const delayValue = data.delay ?? LOG_EXTRACTION_DELAY_DEFAULT;
  const lookbackValue = data.lookbackPeriod ?? LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT;

  const delayError = validateDuration(delayValue);
  const lookbackError = validateDuration(lookbackValue);
  if (delayError || lookbackError) return;

  const delayMs = parseDurationToMs(delayValue);
  const lookbackMs = parseDurationToMs(lookbackValue);
  if (delayMs !== undefined && lookbackMs !== undefined && delayMs >= lookbackMs) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['delay'],
      message: 'must be less than lookbackPeriod',
    });
  }
}

export function validateLogExtractionParams(
  data: LogExtractionBodyParams | undefined,
  ctx: z.RefinementCtx
): void {
  if (!data) return;

  validateFilterParam(data, ctx);
  validateFrequencyParam(data, ctx);
  validateAdditionalIndexPatterns(data, ctx);
  validateDelayVsLookbackPeriod(data, ctx);
}

export const LogExtractionInstallSchema = LogExtractionInstallParams.superRefine(
  validateLogExtractionParams
).optional();

export const LogExtractionUpdadeSchema = LogExtractionUpdateParams.superRefine(
  validateLogExtractionParams
);
