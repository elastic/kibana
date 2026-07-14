/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface BucketInterval {
  value: number;
  unit: 'h' | 'd';
  ms: number;
}

export const deriveBucketInterval = (fromMs: number, toMs: number): BucketInterval => {
  const spanMs = Math.max(0, toMs - fromMs);
  if (spanMs <= 2 * DAY_MS) {
    return { value: 1, unit: 'h', ms: HOUR_MS };
  }
  if (spanMs <= 45 * DAY_MS) {
    return { value: 1, unit: 'd', ms: DAY_MS };
  }
  return { value: 7, unit: 'd', ms: 7 * DAY_MS };
};
