/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CRITICAL_FAILURE_RATE_THRESHOLD } from '../constants';
import type { RetentionStatus } from '../types';

export const isCriticalFailureRate = (failedDocs: number, totalDocs: number): boolean => {
  if (totalDocs === 0) return false;
  return (failedDocs / totalDocs) * 100 >= CRITICAL_FAILURE_RATE_THRESHOLD;
};

export const isQualityIncompatible = (incompatibleFieldCount: number): boolean => {
  return incompatibleFieldCount > 0;
};

export const isRetentionNonCompliant = (status: RetentionStatus): boolean => {
  return status === 'non-compliant';
};

export const hasMissingIntegrations = (missingIntegrations: string[] | undefined): boolean => {
  return Boolean(missingIntegrations?.length);
};
