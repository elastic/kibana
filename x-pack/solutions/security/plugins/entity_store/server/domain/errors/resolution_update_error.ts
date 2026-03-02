/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ResolutionUpdateError extends Error {
  constructor(operation: string, failures: object[]) {
    super(
      `Failed to ${operation}: ${failures.length} update(s) failed. Details: ${JSON.stringify(
        failures
      )}`
    );
    this.name = 'ResolutionUpdateError';
  }
}
