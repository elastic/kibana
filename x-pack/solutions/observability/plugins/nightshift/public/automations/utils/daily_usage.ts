/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_DAILY_LIMIT = 50;
export const SOFT_DAILY_LIMIT = 30;
const HIGH_USAGE_RATIO = 0.71;
const RAISE_FACTOR = 1.5;
const RAISE_STEP = 5;

export type DailyUsageTone = 'exceeded' | 'high' | 'healthy';

export const getDailyUsageTone = (used: number, limit: number): DailyUsageTone => {
  if (used >= limit) return 'exceeded';
  return used / limit >= HIGH_USAGE_RATIO ? 'high' : 'healthy';
};

export const suggestRaisedLimit = (used: number, limit: number): number =>
  Math.min(
    MAX_DAILY_LIMIT,
    Math.max(limit + 1, Math.ceil((Math.max(used, limit) * RAISE_FACTOR) / RAISE_STEP) * RAISE_STEP)
  );
