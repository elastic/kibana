/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphFetchError, getGraphFetchErrorCategory } from './graph_fetch_error';

describe('GraphFetchError', () => {
  it('keeps the message and the status code', () => {
    const error = new GraphFetchError('boom', 503);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('boom');
    expect(error.statusCode).toBe(503);
  });

  it('has no status code when none is given', () => {
    expect(new GraphFetchError('boom').statusCode).toBeUndefined();
  });
});

describe('getGraphFetchErrorCategory', () => {
  it.each([
    [401, 'forbidden'],
    [403, 'forbidden'],
    [408, 'timeout'],
    [504, 'timeout'],
    [400, 'client_error'],
    [404, 'client_error'],
    [429, 'client_error'],
    [500, 'server_error'],
    [502, 'server_error'],
    [503, 'server_error'],
  ])('categorizes status %s as %s', (statusCode, category) => {
    expect(getGraphFetchErrorCategory(new GraphFetchError('failed', statusCode))).toBe(category);
  });

  it('categorizes a GraphFetchError without a status as network', () => {
    expect(getGraphFetchErrorCategory(new GraphFetchError('failed'))).toBe('network');
  });

  it('categorizes a GraphFetchError with an unexpected status as unknown', () => {
    expect(getGraphFetchErrorCategory(new GraphFetchError('failed', 302))).toBe('unknown');
  });

  it('categorizes a plain Error as unknown', () => {
    expect(getGraphFetchErrorCategory(new Error('x'))).toBe('unknown');
  });

  it('categorizes undefined as unknown', () => {
    expect(getGraphFetchErrorCategory(undefined)).toBe('unknown');
  });
});
