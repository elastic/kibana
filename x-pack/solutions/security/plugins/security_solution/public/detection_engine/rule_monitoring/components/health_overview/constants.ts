/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetSpaceHealthResponse } from '../../../../../common/api/detection_engine';

/**
 * The health snapshot shape used as a prop across all health visualization components.
 */
export type HealthData = GetSpaceHealthResponse['health'];

export const RULE_TYPE_NAMES: Record<string, string> = {
  'siem.eqlRule': 'EQL',
  'siem.queryRule': 'Query',
  'siem.savedQueryRule': 'Saved Query',
  'siem.thresholdRule': 'Threshold',
  'siem.mlRule': 'Machine Learning',
  'siem.indicatorRule': 'Indicator Match',
  'siem.newTermsRule': 'New Terms',
  'siem.esqlRule': 'ES|QL',
};

export const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'trace'] as const;

export const CHART_HEIGHT = 220;

export const getRuleTypeName = (key: string): string =>
  RULE_TYPE_NAMES[key] ?? key.replace('siem.', '').replace('Rule', '');

/** Safely read a percentile value regardless of key format (p50, 50.0, 50). */
export const getP = (
  percentiles: Record<string, number> | undefined,
  ...keys: string[]
): number => {
  if (!percentiles) return 0;
  for (const key of keys) {
    if (key in percentiles) return percentiles[key];
  }
  return 0;
};
