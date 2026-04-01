/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical error category constants shared across server and client code.
 *
 * Keys match values intentionally — this enables exhaustiveness checking via
 * `Record<ErrorCategory, …>` without requiring a separate enum type.
 */
export const ERROR_CATEGORIES = {
  anonymization_error: 'anonymization_error',
  cluster_health: 'cluster_health',
  concurrent_conflict: 'concurrent_conflict',
  connector_error: 'connector_error',
  network_error: 'network_error',
  permission_error: 'permission_error',
  rate_limit: 'rate_limit',
  step_registration_error: 'step_registration_error',
  timeout: 'timeout',
  unknown: 'unknown',
  validation_error: 'validation_error',
  workflow_deleted: 'workflow_deleted',
  workflow_disabled: 'workflow_disabled',
  workflow_error: 'workflow_error',
  workflow_invalid: 'workflow_invalid',
} as const;

/** Union of all known error category strings. */
export type ErrorCategory = (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];
