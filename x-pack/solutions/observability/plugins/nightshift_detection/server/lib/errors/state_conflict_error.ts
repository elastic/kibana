/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A conditional write lost to another writer, or a create hit an existing document. */
export class StateConflictError extends Error {
  constructor(public readonly docId: string) {
    super(`State document [${docId}] was changed by someone else`);
    this.name = 'StateConflictError';
  }
}
