/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from './status_error';

/**
 * Thrown when a request would install rules for a disabled source. Surfaces as a 409 Conflict:
 * enabling the source is the way forward.
 */
export class SourceDisabledError extends StatusError {
  constructor(sourceId: string) {
    super(`Source [${sourceId}] is disabled. Enable it to create rule-backed queries.`, 409);
    this.name = 'SourceDisabledError';
  }
}
