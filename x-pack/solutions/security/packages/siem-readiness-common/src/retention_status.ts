/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetentionStatus } from './types';

/**
 * Returns true if the retention policy does not meet the minimum compliance requirement.
 */
export const isRetentionNonCompliant = (status: RetentionStatus): boolean => {
  return status === 'non-compliant';
};

/**
 * Returns true if the retention policy meets the minimum compliance requirement.
 */
export const isRetentionCompliant = (status: RetentionStatus): boolean => {
  return !isRetentionNonCompliant(status);
};
