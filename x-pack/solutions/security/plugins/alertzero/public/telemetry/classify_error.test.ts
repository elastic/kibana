/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyError } from './classify_error';

/** The shape `isHttpFetchError` recognises; `response` is absent when no response came back. */
const httpError = (status?: number): Error =>
  Object.assign(new Error('request failed: index [secret] not found'), {
    name: 'Error',
    request: {},
    response: status === undefined ? undefined : { status },
  });

describe('classifyError', () => {
  it.each([
    [400, 'bad_request'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [408, 'timeout'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unknown'],
  ] as const)('maps HTTP %d to %s', (status, errorClass) => {
    expect(classifyError(httpError(status))).toBe(errorClass);
  });

  it('reports a request that got no response as a network error', () => {
    expect(classifyError(httpError())).toBe('network');
  });

  it.each([
    ['a plain error', new Error('boom')],
    ['a string', 'boom'],
    ['nothing', undefined],
  ])('reports %s as unknown', (_label, error) => {
    expect(classifyError(error)).toBe('unknown');
  });
});
