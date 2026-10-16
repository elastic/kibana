/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Signals that this instance already tracks the maximum number of extractions. */
export class ExtractionCapacityExhaustedError extends Error {
  constructor() {
    super('Extraction tracking capacity is full.');
    this.name = 'ExtractionCapacityExhaustedError';
  }
}
