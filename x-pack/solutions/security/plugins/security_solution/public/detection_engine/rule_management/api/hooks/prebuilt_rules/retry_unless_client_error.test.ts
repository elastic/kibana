/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { retryUnlessClientError } from './retry_unless_client_error';

const httpError = (status: number): IHttpFetchError =>
  Object.assign(new Error('failed'), {
    name: 'HttpFetchError',
    request: {} as Request,
    response: { status } as Response,
  }) as unknown as IHttpFetchError;

describe('retryUnlessClientError', () => {
  it('does not retry a request the server rejected as not found or not allowed', () => {
    expect(retryUnlessClientError(0, httpError(404))).toBe(false);
    expect(retryUnlessClientError(0, httpError(403))).toBe(false);
    expect(retryUnlessClientError(0, httpError(400))).toBe(false);
  });

  it('retries a server error a limited number of times', () => {
    expect(retryUnlessClientError(0, httpError(500))).toBe(true);
    expect(retryUnlessClientError(2, httpError(503))).toBe(true);
    expect(retryUnlessClientError(3, httpError(500))).toBe(false);
  });

  it('retries an error that is not an http error, such as a dropped connection', () => {
    expect(retryUnlessClientError(0, new TypeError('Failed to fetch'))).toBe(true);
  });
});
