/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHttpFetchError } from '../../../test_helpers/create_http_fetch_error';
import { getErrorMessage } from '.';

const FALLBACK = 'Something went wrong';

describe('getErrorMessage', () => {
  it('prefers the response body message, which carries the route’s own wording', () => {
    expect(
      getErrorMessage(
        createHttpFetchError({ body: { message: 'Gate already answered' }, status: 409 }),
        FALLBACK
      )
    ).toBe('Gate already answered');
  });

  it('does NOT throw on a 404, which has no body at all', () => {
    expect(() => getErrorMessage(createHttpFetchError({ status: 404 }), FALLBACK)).not.toThrow();
  });

  it('falls back to the error message on a 404, which has no body at all', () => {
    expect(
      getErrorMessage(createHttpFetchError({ message: 'Not Found', status: 404 }), FALLBACK)
    ).toBe('Not Found');
  });

  it('falls back when the body is a string rather than an object', () => {
    expect(
      getErrorMessage(createHttpFetchError({ body: 'nope', message: '', status: 500 }), FALLBACK)
    ).toBe(FALLBACK);
  });

  it('falls back when the body message is not a string', () => {
    expect(
      getErrorMessage(
        createHttpFetchError({ body: { message: 42 }, message: '', status: 500 }),
        FALLBACK
      )
    ).toBe(FALLBACK);
  });

  it('falls back when the body message is blank', () => {
    expect(
      getErrorMessage(
        createHttpFetchError({ body: { message: '   ' }, message: '', status: 500 }),
        FALLBACK
      )
    ).toBe(FALLBACK);
  });

  it('uses a plain error’s message', () => {
    expect(getErrorMessage(new Error('boom'), FALLBACK)).toBe('boom');
  });

  it('falls back for a value that is not an error', () => {
    expect(getErrorMessage('boom', FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for null', () => {
    expect(getErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });
});
