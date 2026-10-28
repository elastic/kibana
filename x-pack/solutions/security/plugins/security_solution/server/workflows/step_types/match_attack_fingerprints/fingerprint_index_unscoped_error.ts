/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The fingerprint index would not be space-scoped, so this run must not write one. */
export class FingerprintIndexUnscopedError extends Error {
  constructor() {
    super('Attack fingerprint index is not space-scoped');
    this.name = 'FingerprintIndexUnscopedError';
  }
}
