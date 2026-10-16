/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when a run is asked to stop, because the request that started it went away. */
export class RunAbortedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'RunAbortedError';
  }
}
