/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const parseFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseNonNegativeInteger = (value: unknown): number | undefined => {
  const parsed = parseFiniteNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
};

export const parseNonNegativeTruncatedInteger = (value: unknown): number | undefined => {
  const parsed = parseFiniteNumber(value);
  return parsed !== undefined && parsed >= 0 ? Math.trunc(parsed) : undefined;
};
