/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointError } from './errors';

/**
 * Formats an HTTP error thrown by `KbnClient` (a `KbnClientRequesterError`, which exposes `status`
 * and whose message already carries the method, url and response body) into an `EndpointError` that
 * reports the status code.
 */
export class FormattedHttpError extends EndpointError {
  public readonly response: { status: number };

  constructor(error: Error & { status?: number }) {
    super(error.message, error);

    this.response = { status: error.status ?? 0 };
    this.name = this.constructor.name;
  }

  toJSON() {
    return { message: this.message, response: this.response };
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}

/**
 * Used with `promise.catch()`, it will format the HTTP error to a new error and will re-throw
 * @param error
 */
export const catchHttpErrorFormatAndThrow = (error: Error & { status?: number }): never => {
  if (error.status !== undefined) {
    throw new FormattedHttpError(error);
  }

  if (!(error instanceof EndpointError)) {
    throw new EndpointError(error.message, error);
  }

  throw error;
};
