/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetentionStatus } from './types';
import { RETENTION_THRESHOLD_DAYS } from './constants';

/**
 * Parse retention period string (e.g., "30d", "90d", "365d") to number of days.
 * Returns null if the string is absent or unparseable.
 */
export const parseRetentionToDays = (retention: string | null | undefined): number | null => {
  if (!retention) return null;

  const match = retention.match(/^(\d+)([dhms])$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value;
    case 'h':
      return Math.floor(value / 24);
    case 'm':
      return Math.floor(value / (24 * 60));
    case 's':
      return Math.floor(value / (24 * 60 * 60));
    default:
      return null;
  }
};

/**
 * Determine retention compliance status.
 * No retention configured (null) means data is kept forever — always healthy.
 */
export const getRetentionStatus = (retentionDays: number | null): RetentionStatus => {
  if (retentionDays === null) return 'healthy';
  return retentionDays >= RETENTION_THRESHOLD_DAYS ? 'healthy' : 'non-compliant';
};
