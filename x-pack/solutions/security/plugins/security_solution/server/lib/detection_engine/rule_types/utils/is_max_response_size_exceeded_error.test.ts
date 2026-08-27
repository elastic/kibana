/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isMaxResponseSizeExceededError } from './is_max_response_size_exceeded_error';

describe('isMaxResponseSizeExceededError', () => {
  it('returns true for a RequestAbortedError caused by an oversized uncompressed response', () => {
    const error = new errors.RequestAbortedError(
      'The content length (209715200) is bigger than the maximum allowed string (104857600)'
    );

    expect(isMaxResponseSizeExceededError(error)).toBe(true);
  });

  it('returns true for a RequestAbortedError caused by an oversized compressed response', () => {
    const error = new errors.RequestAbortedError(
      'The content length (209715200) is bigger than the maximum allowed buffer (104857600)'
    );

    expect(isMaxResponseSizeExceededError(error)).toBe(true);
  });

  it('returns true for an error matching by name when it is not an instance of RequestAbortedError', () => {
    const error = new Error(
      'The content length (209715200) is bigger than the maximum allowed string (104857600)'
    );
    error.name = 'RequestAbortedError';

    expect(isMaxResponseSizeExceededError(error)).toBe(true);
  });

  it('returns false for a RequestAbortedError with an unrelated message', () => {
    expect(isMaxResponseSizeExceededError(new errors.RequestAbortedError('Request aborted'))).toBe(
      false
    );
  });

  it('returns false for a generic error with a matching message', () => {
    expect(
      isMaxResponseSizeExceededError(
        new Error('The content length (2) is bigger than the maximum allowed string (1)')
      )
    ).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isMaxResponseSizeExceededError(undefined)).toBe(false);
    expect(isMaxResponseSizeExceededError('some string')).toBe(false);
  });
});
