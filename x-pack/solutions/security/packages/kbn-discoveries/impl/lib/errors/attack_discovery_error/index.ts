/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorCategory } from '@kbn/discoveries-schemas';

/**
 * Typed error class for Attack Discovery pipeline failures.
 *
 * Carries a structured `errorCategory` and optional `workflowId` so that
 * catch blocks and telemetry code can read these fields directly instead of
 * re-deriving them from free-form message text.
 */
export class AttackDiscoveryError extends Error {
  readonly errorCategory: ErrorCategory;
  readonly workflowId: string | undefined;

  constructor({
    errorCategory,
    message,
    workflowId,
  }: {
    errorCategory: ErrorCategory;
    message: string;
    workflowId?: string;
  }) {
    super(message);
    this.name = 'AttackDiscoveryError';
    this.errorCategory = errorCategory;
    this.workflowId = workflowId;

    // Restore the prototype chain (required when extending built-ins in TS).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
