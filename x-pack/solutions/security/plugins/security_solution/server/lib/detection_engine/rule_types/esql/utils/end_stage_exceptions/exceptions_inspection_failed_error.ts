/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown before the query runs when the fields of the exceptions cannot be inspected, with the reason of the failed request in the message. */
export class ExceptionsInspectionFailedError extends Error {
  constructor(reason: string) {
    super(
      `The rule did not run because the output columns of its query could not be read to apply its exceptions on them: ${reason}`
    );
    this.name = 'ExceptionsInspectionFailedError';
  }
}
