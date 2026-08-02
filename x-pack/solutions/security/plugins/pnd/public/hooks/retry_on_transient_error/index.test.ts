/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { MAX_RETRY_ATTEMPTS, retryOnTransientError } from '.';

describe('retryOnTransientError', () => {
  it('gives up once the failure count reaches the maximum', () => {
    expect(retryOnTransientError(MAX_RETRY_ATTEMPTS, createHttpFetchError({ status: 500 }))).toBe(
      false
    );
  });

  it('gives up beyond the maximum', () => {
    expect(
      retryOnTransientError(MAX_RETRY_ATTEMPTS + 1, createHttpFetchError({ status: 500 }))
    ).toBe(false);
  });

  it('retries a 500', () => {
    expect(retryOnTransientError(0, createHttpFetchError({ status: 500 }))).toBe(true);
  });

  it('retries a 503, because a not-yet-started plugin can become available', () => {
    expect(retryOnTransientError(0, createHttpFetchError({ status: 503 }))).toBe(true);
  });

  it('retries a transport failure, which carries no response', () => {
    expect(retryOnTransientError(0, createHttpFetchError())).toBe(true);
  });

  it('does not retry a 400', () => {
    expect(retryOnTransientError(0, createHttpFetchError({ status: 400 }))).toBe(false);
  });

  it('does not retry a 403', () => {
    expect(retryOnTransientError(0, createHttpFetchError({ status: 403 }))).toBe(false);
  });

  it('does not retry a 404', () => {
    expect(retryOnTransientError(0, createHttpFetchError({ status: 404 }))).toBe(false);
  });

  it('does not retry a 409', () => {
    expect(retryOnTransientError(0, createHttpFetchError({ status: 409 }))).toBe(false);
  });

  it('retries a non-http error', () => {
    expect(retryOnTransientError(0, new Error('boom'))).toBe(true);
  });

  it('caps retries at three attempts', () => {
    expect(MAX_RETRY_ATTEMPTS).toBe(3);
  });
});
