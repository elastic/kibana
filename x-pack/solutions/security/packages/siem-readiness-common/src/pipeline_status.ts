/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Failure rate above which a pipeline is considered critical (%). */
export const CRITICAL_FAILURE_RATE_THRESHOLD = 1;

/**
 * Calculates the failure rate of a pipeline as a percentage.
 * Returns 0 if no documents have been processed.
 */
export const calculateFailureRate = (failedDocs: number, totalDocs: number): number => {
  if (totalDocs === 0) return 0;
  return (failedDocs / totalDocs) * 100;
};

/**
 * Returns the failure rate as a formatted percentage string (1 decimal place).
 */
export const getFailureRateString = (failedDocs: number, totalDocs: number): string => {
  return `${calculateFailureRate(failedDocs, totalDocs).toFixed(1)}%`;
};

/**
 * Returns true if the pipeline failure rate meets or exceeds the critical threshold.
 */
export const isCriticalFailureRate = (failedDocs: number, totalDocs: number): boolean => {
  return calculateFailureRate(failedDocs, totalDocs) >= CRITICAL_FAILURE_RATE_THRESHOLD;
};

/**
 * Returns true if the pipeline failure rate string meets or exceeds the critical threshold.
 * Accepts values like "1.5%" or "1.5" (percent sign is stripped if present).
 */
export const isCriticalFailureRateFromString = (failureRate: string): boolean => {
  return Number(failureRate.replace('%', '')) >= CRITICAL_FAILURE_RATE_THRESHOLD;
};

/**
 * Returns "critical" or "healthy" based on the pipeline's failure rate.
 */
export const getPipelineStatus = (
  failedDocs: number,
  totalDocs: number
): 'critical' | 'healthy' => {
  return isCriticalFailureRate(failedDocs, totalDocs) ? 'critical' : 'healthy';
};
