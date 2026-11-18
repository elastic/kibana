/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type MitreDataUnavailableReason = 'disabled' | 'population_failed' | 'not_initialized';

export class MitreDataUnavailableError extends Error {
  public readonly reason: MitreDataUnavailableReason;

  constructor(reason: MitreDataUnavailableReason, message?: string) {
    super(message ?? `MITRE data unavailable: ${reason}`);
    this.name = 'MitreDataUnavailableError';
    this.reason = reason;
    Object.setPrototypeOf(this, MitreDataUnavailableError.prototype);
  }
}
