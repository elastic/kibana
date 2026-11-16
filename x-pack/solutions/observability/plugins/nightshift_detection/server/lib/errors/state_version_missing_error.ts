/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Elasticsearch answered a state read or write without the version a later write needs. */
export class StateVersionMissingError extends Error {
  constructor(public readonly docId: string) {
    super(`Elasticsearch returned no version for state document [${docId}]`);
    this.name = 'StateVersionMissingError';
  }
}
