/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CRITICAL_FAILURE_RATE_THRESHOLD } from '@kbn/siem-readiness';

// Re-export predicates from the shared package for UI convenience
export {
  isCriticalFailureRate,
  isQualityIncompatible,
  isRetentionNonCompliant,
  hasMissingIntegrations,
} from '@kbn/siem-readiness';

export { CRITICAL_FAILURE_RATE_THRESHOLD };
export const RETENTION_COMPLIANCE_DAYS = 365; // 12 months

export const calculateFailureRate = (failedDocs: number, totalDocs: number): number => {
  if (totalDocs === 0) return 0;
  return (failedDocs / totalDocs) * 100;
};

export const getFailureRateString = (failedDocs: number, totalDocs: number): string => {
  return calculateFailureRate(failedDocs, totalDocs).toFixed(1);
};

export const isCriticalFailureRateFromString = (failureRate: string): boolean => {
  return Number(failureRate) >= CRITICAL_FAILURE_RATE_THRESHOLD;
};
