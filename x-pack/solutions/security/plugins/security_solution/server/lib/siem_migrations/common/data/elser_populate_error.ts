/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Error thrown from a data-client `populate()` when an Elasticsearch bulk response
 * reports item-level errors. It preserves the Elasticsearch `type` and HTTP
 * `statusCode` from the first item error so callers can classify on the stable
 * `type` rather than the human-readable reason string, which is not version-stable.
 */
export class ElserPopulateError extends Error {
  constructor(message: string, public readonly type?: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'ElserPopulateError';
    // Required so `instanceof` works when targeting ES5/ES2015 (see TS handbook).
    Object.setPrototypeOf(this, ElserPopulateError.prototype);
  }
}
