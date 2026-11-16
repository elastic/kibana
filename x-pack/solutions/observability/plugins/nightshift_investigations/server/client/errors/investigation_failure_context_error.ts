/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A failed timeline write after investigation subjects and execution metadata were recovered. */
export class InvestigationFailureContextError extends Error {
  constructor(cause: Error) {
    super(cause.message, { cause });
    this.name = 'InvestigationFailureContextError';
  }
}
