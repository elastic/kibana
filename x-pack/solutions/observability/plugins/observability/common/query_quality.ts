/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum QueryQualityLevel {
  fastest = 'fastest',
  fast = 'fast',
  default = 'default',
  accurate = 'accurate',
  mostAccurate = 'mostAccurate',
}

const QUALITY_MULTIPLIERS: Record<QueryQualityLevel, number> = {
  [QueryQualityLevel.fastest]: 0.25,
  [QueryQualityLevel.fast]: 0.5,
  [QueryQualityLevel.default]: 1,
  [QueryQualityLevel.accurate]: 2,
  [QueryQualityLevel.mostAccurate]: 4,
};

export function getNumBucketsMultiplier(level: QueryQualityLevel): number {
  return QUALITY_MULTIPLIERS[level] ?? QUALITY_MULTIPLIERS[QueryQualityLevel.default];
}

export function getAdjustedNumBuckets(base: number, multiplier: number): number {
  return Math.min(100, Math.max(1, Math.round(base * multiplier)));
}
