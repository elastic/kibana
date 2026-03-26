/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetentionStatus } from '@kbn/siem-readiness';

// ===== Thresholds (single source of truth) =====
export const CRITICAL_FAILURE_RATE_THRESHOLD = 1; // 1%
export const RETENTION_COMPLIANCE_DAYS = 365; // 12 months

// ===== Continuity =====
export const calculateFailureRate = (failedDocs: number, totalDocs: number): number => {
  if (totalDocs === 0) return 0;
  return (failedDocs / totalDocs) * 100;
};

export const getFailureRateString = (failedDocs: number, totalDocs: number): string => {
  return calculateFailureRate(failedDocs, totalDocs).toFixed(1);
};

export const isCriticalFailureRate = (failedDocs: number, totalDocs: number): boolean => {
  return calculateFailureRate(failedDocs, totalDocs) >= CRITICAL_FAILURE_RATE_THRESHOLD;
};

export const isCriticalFailureRateFromString = (failureRate: string): boolean => {
  return Number(failureRate) >= CRITICAL_FAILURE_RATE_THRESHOLD;
};

// ===== Quality =====
export const isQualityIncompatible = (incompatibleFieldCount: number): boolean => {
  return incompatibleFieldCount > 0;
};

// ===== Retention =====
export const isRetentionNonCompliant = (status: RetentionStatus): boolean => {
  return status === 'non-compliant';
};

// ===== Coverage =====
export const hasMissingIntegrations = (missingIntegrations: string[] | undefined): boolean => {
  return Boolean(missingIntegrations?.length);
};
