/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeError, describeErrorKind } from './describe_error';

class ResponseError extends Error {
  public readonly meta = { statusCode: 403 };
  constructor(message: string) {
    super(message);
    this.name = 'ResponseError';
  }
}

describe('describeError', () => {
  it('names the error and keeps its message, for debug logs', () => {
    expect(describeError(new Error('search_phase_execution_exception'))).toBe(
      'Error: search_phase_execution_exception'
    );
  });

  it('describes a thrown non-error by its type only', () => {
    expect(describeError('a rendered value')).toBe('non-error string');
  });
});

describe('describeErrorKind', () => {
  it('names the error without its message, which may carry rendered input', () => {
    expect(describeErrorKind(new Error('index [secret] not found'))).toBe('Error');
  });

  it('adds the HTTP status of an Elasticsearch response error', () => {
    expect(describeErrorKind(new ResponseError('security_exception: unauthorized'))).toBe(
      'ResponseError (status 403)'
    );
  });

  it('describes a thrown non-error by its type only', () => {
    expect(describeErrorKind({ message: 'rendered' })).toBe('non-error object');
  });
});
