/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpErrorMessage } from './http_error_message';

const httpError = (body: unknown) => Object.assign(new Error('Forbidden'), { body });

describe('httpErrorMessage', () => {
  it("prefers the route's message over the HTTP status text", () => {
    expect(
      httpErrorMessage(httpError({ statusCode: 403, message: 'Missing cluster:manage_transform' }))
    ).toBe('Missing cluster:manage_transform');
  });

  it('falls back to the error message without a body message', () => {
    expect(httpErrorMessage(httpError(undefined))).toBe('Forbidden');
    expect(httpErrorMessage(httpError({ statusCode: 403, message: '' }))).toBe('Forbidden');
    expect(httpErrorMessage(new Error('Network error'))).toBe('Network error');
  });
});
