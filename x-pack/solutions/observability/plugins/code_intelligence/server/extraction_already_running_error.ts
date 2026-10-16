/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Signals that an extraction batch is already running; only 1 batch runs at a time because each run prunes the catalog. */
export class ExtractionAlreadyRunningError extends Error {
  constructor(
    /** Known only when this instance tracks the running batch, not when another instance holds the lock. */
    public readonly extractionId?: string
  ) {
    super('An extraction batch is already running.');
    this.name = 'ExtractionAlreadyRunningError';
  }
}
