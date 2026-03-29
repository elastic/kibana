/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { validateDataView } from '@kbn/data-view-validation';
import { fromKueryExpression } from '@kbn/es-query';

const DURATION_REGEX = /^[1-9][0-9]*[smdh]$/;
const MIN_FREQUENCY_MS = 30 * 1000;

const durationString = z.string().regex(DURATION_REGEX);

export const LogExtractionUpdateParams = z.object({
  filter: z.string().optional(),
  fieldHistoryLength: z.number().int().positive().optional(),
  additionalIndexPatterns: z.array(z.string()).optional(),
  lookbackPeriod: durationString.optional(),
  frequency: durationString.optional(),
  delay: durationString.optional(),
  docsLimit: z.number().int().positive().optional(),
});

export type LogExtractionUpdateParams = z.infer<typeof LogExtractionUpdateParams>;

/**
 * Parse a duration string like '30s', '1m', '3h', '1d' into milliseconds.
 */
export const parseDurationToMs = (duration: string): number => {
  const value = parseInt(duration, 10);
  const unit = duration.slice(-1);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 0);
};

export const validateFilter = (filter: string): string | undefined => {
  if (!filter || filter.trim() === '') return undefined;
  try {
    fromKueryExpression(filter);
    if (/(\s+)(and|or)\s*$/i.test(filter)) {
      return 'Incomplete KQL expression';
    }
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid KQL filter';
  }
};

export const validateFrequency = (frequency: string): string | undefined => {
  if (!DURATION_REGEX.test(frequency)) return 'Invalid duration format';
  if (parseDurationToMs(frequency) < MIN_FREQUENCY_MS) {
    return 'Minimum frequency is 30 seconds';
  }
  return undefined;
};

export const validateDuration = (value: string): string | undefined => {
  if (!value) return undefined;
  return DURATION_REGEX.test(value) ? undefined : 'Invalid duration format';
};

export const validateIndexPattern = (pattern: string): string | undefined => {
  if (pattern.trim().length === 0) return 'Index pattern cannot be empty';
  const errors = validateDataView(pattern);
  const illegalChars = errors.ILLEGAL_CHARACTERS ?? [];
  const hasSpaces = errors.CONTAINS_SPACES;
  if (illegalChars.length > 0 || hasSpaces) {
    return 'Invalid index pattern (no spaces or illegal characters)';
  }
  return undefined;
};

export const validateIndexPatterns = (patterns: string[]): string | undefined => {
  for (const pattern of patterns) {
    const error = validateIndexPattern(pattern);
    if (error) return `"${pattern}": ${error}`;
  }
  return undefined;
};
